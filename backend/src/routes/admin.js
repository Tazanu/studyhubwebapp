const express = require('express');
const prisma = require('../prisma');
const adminAuth = require('../middleware/admin');

const router = express.Router();

// All routes require admin
router.use(adminAuth);

// ===================== OVERVIEW STATS =====================
router.get('/stats', async (req, res) => {
    try {
        const [users, tutors, groups, notes, questions, bookings] = await Promise.all([
            prisma.users.count(),
            prisma.tutors.groupBy({ by: ['status'], _count: true }),
            prisma.groups.count(),
            prisma.notes.count(),
            prisma.questions.count(),
            prisma.bookings.groupBy({ by: ['status'], _count: true }),
        ]);

        const tutorMap = Object.fromEntries(tutors.map(t => [t.status, t._count]));
        const bookingMap = Object.fromEntries(bookings.map(b => [b.status, b._count]));

        res.json({
            users,
            tutors: {
                pending:   tutorMap.pending   || 0,
                approved:  tutorMap.approved  || 0,
                rejected:  tutorMap.rejected  || 0,
            },
            groups,
            notes,
            questions,
            bookings: {
                pending:   bookingMap.pending   || 0,
                confirmed: bookingMap.confirmed || 0,
                completed: bookingMap.completed || 0,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ===================== LIST USERS =====================
router.get('/users', async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const where = search
            ? { OR: [
                { first_name: { contains: search, mode: 'insensitive' } },
                { last_name:  { contains: search, mode: 'insensitive' } },
                { email:      { contains: search, mode: 'insensitive' } },
            ]}
            : {};

        const [data, total] = await Promise.all([
            prisma.users.findMany({
                where,
                select: {
                    id: true, email: true, first_name: true, last_name: true,
                    university: true, role: true, is_active: true,
                    reputation: true, created_at: true,
                    tutors: { select: { status: true } },
                },
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * limit,
                take: Number(limit),
            }),
            prisma.users.count({ where }),
        ]);

        res.json({ data, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// ===================== TOGGLE USER ACTIVE =====================
router.patch('/users/:id/toggle', async (req, res) => {
    try {
        const user = await prisma.users.findUnique({ where: { id: Number(req.params.id) }, select: { is_active: true } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        const updated = await prisma.users.update({
            where: { id: Number(req.params.id) },
            data: { is_active: !user.is_active },
            select: { id: true, is_active: true },
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// ===================== CHANGE USER ROLE =====================
router.patch('/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
        const updated = await prisma.users.update({
            where: { id: Number(req.params.id) },
            data: { role },
            select: { id: true, role: true },
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// ===================== LIST TUTOR APPLICATIONS =====================
router.get('/tutors', async (req, res) => {
    try {
        const { status = 'pending' } = req.query;
        const tutors = await prisma.tutors.findMany({
            where: status === 'all' ? {} : { status },
            include: {
                users: { select: { id: true, first_name: true, last_name: true, email: true, university: true } },
            },
            orderBy: { applied_at: 'desc' },
        });
        res.json(tutors);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tutor applications' });
    }
});

// ===================== APPROVE / REJECT TUTOR =====================
router.patch('/tutors/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
        const tutor = await prisma.tutors.update({
            where: { id: Number(req.params.id) },
            data: { status },
            include: { users: { select: { id: true, first_name: true, last_name: true, email: true } } },
        });

        // Notify the tutor
        if (status === 'approved' || status === 'rejected') {
            await prisma.notifications.create({
                data: {
                    user_id: tutor.user_id,
                    type: status === 'approved' ? 'tutor_approved' : 'tutor_rejected',
                    message: status === 'approved'
                        ? '🎉 Your tutor application has been approved! You can now accept bookings and post premium notes.'
                        : 'Your tutor application was not approved at this time. You may reapply after updating your profile.',
                    is_read: false,
                },
            });
        }

        res.json(tutor);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update tutor status' });
    }
});

// ===================== PREMIUM NOTES =====================
router.get('/premium/notes', async (req, res) => {
    try {
        const notes = await prisma.premium_notes.findMany({
            include: {
                users: { select: { id: true, first_name: true, last_name: true } },
                _count: { select: { purchased_notes: true } },
            },
            orderBy: { created_at: 'desc' },
        });
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch premium notes' });
    }
});

// ── Payment credential diagnostics ───────────────────────────────────────────
// Admin-only. Reports a fingerprint of each MeSomb key — never the key itself —
// so a value that differs between environments can be identified without
// anyone reading secrets out of a dashboard. Added because a deployed server
// kept returning "Bad signature" while the identical keys signed fine locally,
// and there was no way to see which value the server actually held.
router.get('/payments/diagnostics', async (req, res) => {
    try {
        const fingerprint = (name) => {
            const raw = process.env[name];
            if (!raw) return { name, present: false };
            const trimmed = raw.trim();
            return {
                name,
                present: true,
                length: raw.length,
                head: trimmed.slice(0, 6),
                tail: trimmed.slice(-4),
                hasWhitespace: raw !== trimmed,
                hasQuotes: /^["']|["']$/.test(trimmed),
                // A short digest is enough to compare two environments without
                // revealing anything usable.
                sha256_8: require('crypto').createHash('sha256').update(raw).digest('hex').slice(0, 8),
            };
        };

        const keys = ['MESOMB_APPLICATION_KEY', 'MESOMB_ACCESS_KEY', 'MESOMB_SECRET_KEY']
            .map(fingerprint);

        let live = { ok: false };
        try {
            const status = await require('../mesomb').getPaymentClient().getStatus();
            live = {
                ok: true,
                application: status?.name,
                providers: (status?.balances || []).map(b => `${b.provider}:${b.value}${b.currency}`),
                countries: status?.countries,
            };
        } catch (e) {
            live = { ok: false, error: e?.name, detail: (e?.message || '').split('\n')[0].slice(0, 160) };
        }

        res.json({
            nodeEnv: process.env.NODE_ENV || '(unset)',
            serverTime: new Date().toISOString(),
            keys,
            live,
        });
    } catch (err) {
        console.error('Payment diagnostics error:', err);
        res.status(500).json({ error: 'Diagnostics failed' });
    }
});

// ── Publishing trust override ────────────────────────────────────────────────
// By default a tutor earns or loses the review exemption from their own record
// (services/uploaderTrust.js). This overrides that in either direction: grant
// it to someone known-good before they have the history, or withhold it from
// someone whose record looks clean but whose work needs watching.
// `null` hands them back to the automatic rule.
router.patch('/tutors/:id/trust', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { exempt } = req.body;

        if (![true, false, null].includes(exempt)) {
            return res.status(400).json({ error: 'exempt must be true, false or null' });
        }

        const tutor = await prisma.tutors.findUnique({ where: { id }, select: { user_id: true } });
        if (!tutor) return res.status(404).json({ error: 'Tutor not found' });

        await prisma.tutors.update({ where: { id }, data: { review_exempt: exempt } });
        const trust = await assessUploaderTrust(tutor.user_id);

        res.json({ success: true, review_exempt: exempt, trust });
    } catch (err) {
        console.error('Set publishing trust error:', err);
        res.status(500).json({ error: 'Failed to update publishing trust' });
    }
});

// ── Review queue ─────────────────────────────────────────────────────────────
// Everything awaiting a decision, oldest first so nothing sits forgotten.
// Carries the automated report so the reviewer knows what the checks already
// found — but the reviewer's job is the part no check can do: reading the
// material and judging whether it is actually correct.
router.get('/premium/notes/pending', async (req, res) => {
    try {
        const notes = await prisma.premium_notes.findMany({
            where: { review_status: 'pending' },
            include: { users: { select: { id: true, first_name: true, last_name: true, email: true } } },
            orderBy: { created_at: 'asc' },
        });
        res.json(notes.map(({ file_path, ...n }) => n));
    } catch (err) {
        console.error('Fetch review queue error:', err);
        res.status(500).json({ error: 'Failed to fetch the review queue' });
    }
});

// Approve or reject. A rejection must say why: the author cannot fix material
// when the only feedback is that it was refused.
router.patch('/premium/notes/:id/review', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status, note: reviewNote } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be "approved" or "rejected"' });
        }
        if (status === 'rejected' && !String(reviewNote || '').trim()) {
            return res.status(400).json({ error: 'A reason is required when rejecting, so the author can correct it.' });
        }

        const existing = await prisma.premium_notes.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Note not found' });

        const updated = await prisma.premium_notes.update({
            where: { id },
            data: {
                review_status: status,
                review_note: String(reviewNote || '').trim() || null,
                reviewed_by: req.userId,
                reviewed_at: new Date(),
                // A rejected note stays in the table for the author to see and
                // revise, but must not be listed anywhere as if it were on sale.
                ...(status === 'rejected' ? { is_active: false } : { is_active: true }),
            },
            select: { id: true, title: true, review_status: true, review_note: true, reviewed_at: true },
        });

        // `message` is VarChar(500) and there is no title column, so build one
        // string and truncate it rather than letting the insert throw.
        const body = status === 'approved'
            ? `Your premium note "${existing.title}" was approved and is now available to buyers.`
            : `Your premium note "${existing.title}" was not approved. Reason: ${String(reviewNote).trim()}`;

        await prisma.notifications.create({
            data: {
                user_id: existing.uploaded_by,
                type: status === 'approved' ? 'note_approved' : 'note_rejected',
                message: body.slice(0, 500),
            },
        }).catch(e => console.error('Review notification failed:', e.message));

        res.json({ success: true, note: updated });
    } catch (err) {
        console.error('Review premium note error:', err);
        res.status(500).json({ error: 'Failed to record the review' });
    }
});

router.patch('/premium/notes/:id/toggle', async (req, res) => {
    try {
        const note = await prisma.premium_notes.findUnique({ where: { id: Number(req.params.id) }, select: { is_active: true } });
        if (!note) return res.status(404).json({ error: 'Note not found' });
        const updated = await prisma.premium_notes.update({
            where: { id: Number(req.params.id) },
            data: { is_active: !note.is_active },
            select: { id: true, is_active: true },
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to toggle note' });
    }
});

router.delete('/premium/notes/:id', async (req, res) => {
    try {
        await prisma.premium_notes.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// ===================== PREMIUM SUBSCRIPTIONS =====================
router.get('/premium/subscriptions', async (req, res) => {
    try {
        const subs = await prisma.premium_subscriptions.findMany({
            include: { users: { select: { id: true, first_name: true, last_name: true, email: true } } },
            orderBy: { created_at: 'desc' },
        });
        res.json(subs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
});

module.exports = router;
