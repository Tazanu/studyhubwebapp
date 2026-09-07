/**
 * Order pricing and entitlement granting.
 *
 * Two rules this module exists to enforce:
 *   1. Prices are ALWAYS resolved server-side from the database. The client
 *      never sends an amount.
 *   2. Granting is idempotent. Concurrent status polls race on a conditional
 *      status update, so exactly one caller performs the grant.
 */
const prisma = require('../prisma');

const PLATFORM_FEE = 1000; // FCFA/month - premium publisher subscription
const BASE_HOURLY_RATE = 500; // FCFA/hour fallback, mirrors the frontend default

/**
 * Tutor pricing plans. Kept here so the server, not the browser, decides what a
 * plan costs. `sessions` and `discount` mirror the cards shown on the tutor page.
 */
const TUTOR_PLANS = {
    single: { name: 'Single Session', sessions: 1, discount: 1 },
    monthly: { name: 'Monthly Pack', sessions: 4, discount: 0.9 },
    semester: { name: 'Semester Bundle', sessions: 16, discount: 0.8 },
};

/** Order types, and which table each one is priced from. */
const ORDER_TYPES = {
    subscription: 'premium_subscriptions',
    note_purchase: 'premium_notes', // Premium Notes marketplace
    paid_note: 'notes',             // a regular note flagged is_premium
    tutor_booking: 'bookings',
    pricing_plan: 'tutors',         // prepaid session pack on a tutor profile
};

class OrderError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

// -- entitlement checks -------------------------------------------------------

async function hasActiveSubscription(userId) {
    const sub = await prisma.premium_subscriptions.findFirst({
        where: { user_id: userId, status: 'active', expires_at: { gt: new Date() } },
    });
    return !!sub;
}

async function hasPurchasedPremiumNote(userId, noteId) {
    const p = await prisma.purchased_notes.findUnique({
        where: { user_id_premium_note_id: { user_id: userId, premium_note_id: noteId } },
    });
    return !!p;
}

/**
 * Regular notes have no purchase table, so a completed transaction is the
 * record of sale.
 */
async function hasPurchasedPaidNote(userId, noteId) {
    const tx = await prisma.transactions.findFirst({
        where: {
            user_id: userId,
            type: 'paid_note',
            status: 'completed',
            metadata: { path: ['noteId'], equals: noteId },
        },
    });
    return !!tx;
}

// -- pricing ------------------------------------------------------------------

/**
 * Resolve what the user is buying and what it costs. Throws OrderError.
 * @returns {Promise<{ type: string, amount: number, description: string, metadata: object }>}
 */
async function resolveOrder(userId, { type, noteId, bookingId, tutorId, planKey }) {
    if (!ORDER_TYPES[type]) throw new OrderError(400, 'Invalid payment type');

    const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
    });
    if (!user) throw new OrderError(404, 'User not found');

    if (type === 'subscription') {
        if (user.role === 'admin') throw new OrderError(400, 'Admins do not need a subscription');
        if (await hasActiveSubscription(userId)) {
            throw new OrderError(400, 'You already have an active subscription');
        }
        return {
            type,
            amount: PLATFORM_FEE,
            description: 'Monthly premium publisher subscription',
            metadata: {},
        };
    }

    if (type === 'note_purchase') {
        const id = parseInt(noteId);
        if (!id) throw new OrderError(400, 'noteId is required');
        if (user.role === 'admin') throw new OrderError(400, 'Admins have free access');
        const note = await prisma.premium_notes.findUnique({ where: { id } });
        if (!note || !note.is_active) throw new OrderError(404, 'Note not found');
        if (note.uploaded_by === userId) throw new OrderError(400, 'You already own this note');
        if (await hasPurchasedPremiumNote(userId, id)) {
            throw new OrderError(400, 'You already own this note');
        }
        return {
            type,
            amount: Number(note.price),
            description: 'Purchase premium note: ' + note.title,
            metadata: { noteId: id, noteTitle: note.title },
        };
    }

    if (type === 'paid_note') {
        const id = parseInt(noteId);
        if (!id) throw new OrderError(400, 'noteId is required');
        const note = await prisma.notes.findUnique({ where: { id } });
        if (!note || note.is_active === false) throw new OrderError(404, 'Note not found');
        if (!note.is_premium) throw new OrderError(400, 'This note is free to download');
        if (note.uploaded_by === userId) throw new OrderError(400, 'You already own this note');
        if (await hasPurchasedPaidNote(userId, id)) {
            throw new OrderError(400, 'You already own this note');
        }
        return {
            type,
            amount: Number(note.price),
            description: 'Purchase note: ' + note.title,
            metadata: { noteId: id, noteTitle: note.title },
        };
    }

    if (type === 'pricing_plan') {
        const tId = parseInt(tutorId);
        const plan = TUTOR_PLANS[planKey];
        if (!plan) throw new OrderError(400, 'Unknown pricing plan');
        if (!tId) throw new OrderError(400, 'tutorId is required');
        const tutor = await prisma.tutors.findUnique({ where: { id: tId } });
        if (!tutor) throw new OrderError(404, 'Tutor not found');

        const rate = parseFloat(tutor.hourly_rate) || BASE_HOURLY_RATE;
        return {
            type,
            amount: Math.round(rate * plan.sessions * plan.discount),
            description: `${plan.name} with tutor #${tId} (${plan.sessions} session${plan.sessions > 1 ? 's' : ''})`,
            metadata: { tutorId: tId, plan: planKey, sessions: plan.sessions },
        };
    }

    // tutor_booking
    const id = parseInt(bookingId);
    if (!id) throw new OrderError(400, 'bookingId is required');
    const booking = await prisma.bookings.findUnique({ where: { id } });
    if (!booking) throw new OrderError(404, 'Booking not found');
    if (booking.student_id !== userId) throw new OrderError(403, 'This booking belongs to another user');
    if (booking.status === 'confirmed') throw new OrderError(400, 'This session is already paid for');
    return {
        type,
        amount: Number(booking.total_amount),
        description: 'Tutoring session on ' + booking.session_date.toISOString().split('T')[0],
        metadata: { bookingId: id, tutorId: booking.tutor_id },
    };
}

// -- granting -----------------------------------------------------------------

/**
 * Mark a pending transaction completed and grant what it paid for.
 * Safe to call concurrently: the conditional update means only the first
 * caller grants, and later callers get the already-granted result.
 *
 * @returns {Promise<object>} payload describing the granted entitlement
 */
async function completeOrder(txId) {
    const claimed = await prisma.transactions.updateMany({
        where: { id: txId, status: 'pending' },
        data: { status: 'completed', updated_at: new Date() },
    });

    const tx = await prisma.transactions.findUnique({ where: { id: txId } });
    if (!tx) throw new OrderError(404, 'Transaction not found');

    // Another concurrent poll already granted this - return the settled view.
    if (claimed.count === 0) return describeGranted(tx);

    if (tx.type === 'subscription') {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        await prisma.premium_subscriptions.create({
            data: {
                user_id: tx.user_id,
                expires_at: expiresAt,
                status: 'active',
                tx_ref: tx.reference,
            },
        });
    } else if (tx.type === 'note_purchase') {
        const noteId = tx.metadata?.noteId;
        await prisma.purchased_notes.create({
            data: {
                user_id: tx.user_id,
                premium_note_id: noteId,
                tx_ref: tx.reference,
                amount_paid: tx.amount,
            },
        });
        await prisma.premium_notes.update({
            where: { id: noteId },
            data: { downloads: { increment: 1 } },
        });
    } else if (tx.type === 'tutor_booking') {
        await prisma.bookings.update({
            where: { id: tx.metadata?.bookingId },
            data: { status: 'confirmed', updated_at: new Date() },
        });
    } else if (tx.type === 'pricing_plan') {
        // A pack of prepaid sessions with this tutor, valid for a year.
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        await prisma.session_credits.create({
            data: {
                user_id: tx.user_id,
                tutor_id: tx.metadata?.tutorId,
                plan: tx.metadata?.plan,
                total: tx.metadata?.sessions,
                used: 0,
                tx_ref: tx.reference,
                expires_at: expiresAt,
            },
        });
    }
    // paid_note needs no extra row - the completed transaction is the receipt.

    return describeGranted(tx);
}

/** Build the response payload for a completed transaction. */
async function describeGranted(tx) {
    if (tx.type === 'subscription') {
        const subscription = await prisma.premium_subscriptions.findFirst({
            where: { user_id: tx.user_id, status: 'active' },
            orderBy: { expires_at: 'desc' },
        });
        return { type: tx.type, subscription };
    }
    // Note purchases deliberately return no file_path: the buyer fetches the
    // content through the entitlement-checked file route instead.
    if (tx.type === 'note_purchase') {
        return { type: tx.type, noteId: tx.metadata?.noteId, downloadPath: `/premium/notes/${tx.metadata?.noteId}/file` };
    }
    if (tx.type === 'paid_note') {
        return { type: tx.type, noteId: tx.metadata?.noteId, downloadPath: `/notes/${tx.metadata?.noteId}/file` };
    }
    if (tx.type === 'pricing_plan') {
        return {
            type: tx.type,
            tutorId: tx.metadata?.tutorId,
            plan: tx.metadata?.plan,
            sessions: tx.metadata?.sessions,
        };
    }
    return { type: tx.type, bookingId: tx.metadata?.bookingId };
}

// -- session credits ----------------------------------------------------------

/** Packs with sessions still on them, soonest to expire first. */
async function availableCreditPacks(userId, tutorId) {
    const packs = await prisma.session_credits.findMany({
        where: {
            user_id: userId,
            tutor_id: tutorId,
            OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
        },
        orderBy: [{ expires_at: 'asc' }, { created_at: 'asc' }],
    });
    return packs.filter(p => p.used < p.total);
}

/** How many prepaid sessions this student has left with this tutor. */
async function creditBalance(userId, tutorId) {
    const packs = await availableCreditPacks(userId, tutorId);
    return packs.reduce((sum, p) => sum + (p.total - p.used), 0);
}

/**
 * Spend one prepaid session. Uses a conditional update so two bookings racing
 * for the last credit cannot both win.
 *
 * @returns {Promise<{ pack: object, remaining: number } | null>} null if none left
 */
async function consumeCredit(userId, tutorId) {
    for (const pack of await availableCreditPacks(userId, tutorId)) {
        const claimed = await prisma.session_credits.updateMany({
            where: { id: pack.id, used: pack.used },   // optimistic lock
            data: { used: pack.used + 1, updated_at: new Date() },
        });
        if (claimed.count === 1) {
            return { pack, remaining: await creditBalance(userId, tutorId) };
        }
        // someone else took it — try the next pack
    }
    return null;
}

/** Give a credit back, e.g. when a booking is cancelled. */
async function refundCredit(packId) {
    const pack = await prisma.session_credits.findUnique({ where: { id: packId } });
    if (!pack || pack.used <= 0) return false;
    const restored = await prisma.session_credits.updateMany({
        where: { id: packId, used: pack.used },
        data: { used: pack.used - 1, updated_at: new Date() },
    });
    return restored.count === 1;
}

/** Mark a pending transaction failed (no-op if already settled). */
async function failOrder(txId) {
    await prisma.transactions.updateMany({
        where: { id: txId, status: 'pending' },
        data: { status: 'failed', updated_at: new Date() },
    });
}

module.exports = {
    PLATFORM_FEE,
    TUTOR_PLANS,
    ORDER_TYPES,
    OrderError,
    resolveOrder,
    completeOrder,
    failOrder,
    describeGranted,
    hasActiveSubscription,
    hasPurchasedPremiumNote,
    hasPurchasedPaidNote,
    availableCreditPacks,
    creditBalance,
    consumeCredit,
    refundCredit,
};
