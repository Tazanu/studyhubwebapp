const express = require('express');
const path = require('path');
const prisma = require('../prisma');
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getPaymentClient, RandomGenerator } = require('../mesomb');

const router = express.Router();
const PLATFORM_FEE = 1000; // FCFA/month

// ── helpers ───────────────────────────────────────────────────────────────────

async function getUser(userId) {
    return prisma.users.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            tutors: { select: { status: true } },
        },
    });
}

async function hasActiveSubscription(userId) {
    const sub = await prisma.premium_subscriptions.findFirst({
        where: { user_id: userId, status: 'active', expires_at: { gt: new Date() } },
    });
    return !!sub;
}

async function hasPurchasedNote(userId, noteId) {
    const p = await prisma.purchased_notes.findUnique({
        where: { user_id_premium_note_id: { user_id: userId, premium_note_id: noteId } },
    });
    return !!p;
}

// ── GET /premium/subscription/status ─────────────────────────────────────────
router.get('/subscription/status', authenticate, async (req, res) => {
    try {
        const active = await hasActiveSubscription(req.userId);
        const sub = active
            ? await prisma.premium_subscriptions.findFirst({
                where: { user_id: req.userId, status: 'active', expires_at: { gt: new Date() } },
                orderBy: { expires_at: 'desc' },
              })
            : null;
        res.json({ active, expires_at: sub?.expires_at || null });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check subscription' });
    }
});

// ── POST /premium/pay/initiate ────────────────────────────────────────────────
// Initiates a MeSomb payment and returns a pending transaction ID.
// The frontend then polls /pay/status/:txId until confirmed.
router.post('/pay/initiate', authenticate, async (req, res) => {
    try {
        const { service, payer, type, noteId } = req.body;
        // type: 'subscription' | 'note_purchase'
        if (!service || !payer || !type) {
            return res.status(400).json({ error: 'service, payer, and type are required' });
        }

        const user = await getUser(req.userId);

        let amount;
        let description;
        let meta = {};

        if (type === 'subscription') {
            if (user.role === 'admin') return res.status(400).json({ error: 'Admins do not need a subscription' });
            const already = await hasActiveSubscription(req.userId);
            if (already) return res.status(400).json({ error: 'You already have an active subscription' });
            amount = PLATFORM_FEE;
            description = 'Monthly premium publisher subscription';
        } else if (type === 'note_purchase') {
            if (!noteId) return res.status(400).json({ error: 'noteId is required for note_purchase' });
            if (user.role === 'admin') return res.status(400).json({ error: 'Admins have free access' });
            const note = await prisma.premium_notes.findUnique({ where: { id: parseInt(noteId) } });
            if (!note || !note.is_active) return res.status(404).json({ error: 'Note not found' });
            const already = await hasPurchasedNote(req.userId, parseInt(noteId));
            if (already) return res.status(400).json({ error: 'You already own this note' });
            amount = Number(note.price);
            description = `Purchase premium note: ${note.title}`;
            meta = { noteId: note.id, noteTitle: note.title };
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }

        // Create pending transaction in DB first
        const tx = await prisma.transactions.create({
            data: {
                user_id: req.userId,
                amount,
                type,
                status: 'pending',
                description,
                metadata: meta,
            },
        });

        // Initiate MeSomb collect — this sends the USSD push to the phone
        const payment = getPaymentClient();
        let mesombRef = null;
        try {
            const response = await payment.makeCollect({
                amount,
                service,
                payer,
                country: 'CM',
                currency: 'XAF',
                nonce: RandomGenerator.nonce(),
            });
            mesombRef = response.transaction?.pk || null;

            // Update transaction with MeSomb reference
            await prisma.transactions.update({
                where: { id: tx.id },
                data: { reference: mesombRef },
            });
        } catch (mesombErr) {
            // MeSomb call itself failed (network, auth, etc.)
            await prisma.transactions.update({ where: { id: tx.id }, data: { status: 'failed' } });
            console.error('MeSomb initiate error:', mesombErr.message);
            return res.status(500).json({ error: 'Failed to initiate payment. Please try again.' });
        }

        res.json({ success: true, txId: tx.id, mesombRef });
    } catch (err) {
        console.error('Initiate payment error:', err);
        res.status(500).json({ error: 'Failed to initiate payment', details: err.message });
    }
});

// ── GET /premium/pay/status/:txId ─────────────────────────────────────────────
// Polls the status of a pending payment. Frontend calls this every 3s.
router.get('/pay/status/:txId', authenticate, async (req, res) => {
    try {
        const txId = parseInt(req.params.txId);
        const tx = await prisma.transactions.findUnique({ where: { id: txId } });

        if (!tx || tx.user_id !== req.userId) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Already resolved
        if (tx.status === 'completed') return res.json({ status: 'completed' });
        if (tx.status === 'failed')    return res.json({ status: 'failed', error: 'Payment was declined or timed out.' });

        // Still pending — check with MeSomb
        if (!tx.reference) {
            return res.json({ status: 'pending' });
        }

        const payment = getPaymentClient();
        let mesombStatus = 'PENDING';
        try {
            const result = await payment.checkTransactions([tx.reference]);
            // result is an array of transaction objects
            const found = Array.isArray(result) ? result[0] : result;
            mesombStatus = found?.status || found?.data?.status || 'PENDING';
        } catch (e) {
            console.error('checkTransactions error:', e.message);
            return res.json({ status: 'pending' }); // keep polling
        }

        if (mesombStatus === 'SUCCESS') {
            // Grant access
            await prisma.transactions.update({ where: { id: txId }, data: { status: 'completed' } });

            if (tx.type === 'subscription') {
                const expiresAt = new Date();
                expiresAt.setMonth(expiresAt.getMonth() + 1);
                const sub = await prisma.premium_subscriptions.create({
                    data: {
                        user_id: req.userId,
                        expires_at: expiresAt,
                        status: 'active',
                        tx_ref: tx.reference,
                    },
                });
                return res.json({ status: 'completed', type: 'subscription', subscription: sub });
            }

            if (tx.type === 'note_purchase') {
                const noteId = tx.metadata?.noteId;
                const note = await prisma.premium_notes.findUnique({ where: { id: noteId } });
                await prisma.purchased_notes.create({
                    data: {
                        user_id: req.userId,
                        premium_note_id: noteId,
                        tx_ref: tx.reference,
                        amount_paid: tx.amount,
                    },
                });
                await prisma.premium_notes.update({
                    where: { id: noteId },
                    data: { downloads: { increment: 1 } },
                });
                return res.json({ status: 'completed', type: 'note_purchase', file_path: note?.file_path });
            }
        }

        if (mesombStatus === 'FAILED' || mesombStatus === 'REVERSED') {
            await prisma.transactions.update({ where: { id: txId }, data: { status: 'failed' } });
            return res.json({ status: 'failed', error: 'Payment was declined. Please try again.' });
        }

        // Still PENDING on MeSomb side
        res.json({ status: 'pending' });
    } catch (err) {
        console.error('Poll status error:', err);
        res.status(500).json({ error: 'Failed to check payment status' });
    }
});

// ── GET /premium/pay/receipt/:txId ──────────────────────────────────────────
router.get('/pay/receipt/:txId', authenticate, async (req, res) => {
    try {
        const txId = parseInt(req.params.txId);
        const tx = await prisma.transactions.findUnique({
            where: { id: txId },
            include: { users: { select: { first_name: true, last_name: true, email: true } } },
        });
        if (!tx || tx.user_id !== req.userId) return res.status(404).json({ error: 'Receipt not found' });
        if (tx.status !== 'completed') return res.status(400).json({ error: 'Payment not completed' });
        res.json({
            receiptNo: `SH-${String(tx.id).padStart(6, '0')}`,
            date: tx.updated_at || tx.created_at,
            name: `${tx.users.first_name} ${tx.users.last_name}`,
            email: tx.users.email,
            description: tx.description,
            type: tx.type,
            amount: Number(tx.amount),
            reference: tx.reference,
            status: tx.status,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch receipt' });
    }
});

// ── GET /premium/notes ────────────────────────────────────────────────────────
router.get('/notes', authenticate, async (req, res) => {
    try {
        const { subject } = req.query;
        const where = { is_active: true };
        if (subject) where.subject = subject;

        const notes = await prisma.premium_notes.findMany({
            where,
            include: { users: { select: { id: true, first_name: true, last_name: true } } },
            orderBy: { created_at: 'desc' },
        });

        const purchases = await prisma.purchased_notes.findMany({
            where: { user_id: req.userId },
            select: { premium_note_id: true },
        });
        const purchasedIds = new Set(purchases.map(p => p.premium_note_id));
        const user = await getUser(req.userId);

        const result = notes.map(n => ({
            ...n,
            purchased: user.role === 'admin' || purchasedIds.has(n.id),
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch premium notes' });
    }
});

// ── POST /premium/notes ───────────────────────────────────────────────────────
router.post('/notes', authenticate, upload.single('file'), async (req, res) => {
    try {
        const user = await getUser(req.userId);
        const isAdmin = user.role === 'admin';
        const isApprovedTutor = user.tutors?.status === 'approved';

        if (!isAdmin && !isApprovedTutor) {
            return res.status(403).json({ error: 'Only approved tutors can post premium notes' });
        }

        const { title, description, subject, price, tags } = req.body;
        if (!title || !description || !subject) {
            return res.status(400).json({ error: 'Title, description, and subject are required' });
        }
        if (!req.file) return res.status(400).json({ error: 'A file is required' });

        const note = await prisma.premium_notes.create({
            data: {
                title,
                description,
                subject,
                file_path: `/uploads/${req.file.filename}`,
                file_type: path.extname(req.file.originalname).replace('.', ''),
                price: parseFloat(price) || 0,
                tags: tags ? tags.split(',').map(t => t.trim()) : [],
                uploaded_by: req.userId,
            },
        });

        res.status(201).json({ success: true, note });
    } catch (err) {
        console.error('Premium note upload error:', err);
        res.status(500).json({ error: 'Failed to upload premium note' });
    }
});

// ── GET /premium/notes/:id/access ────────────────────────────────────────────
router.get('/notes/:id/access', authenticate, async (req, res) => {
    try {
        const noteId = parseInt(req.params.id);
        const user = await getUser(req.userId);
        if (user.role === 'admin') return res.json({ access: true });
        const purchased = await hasPurchasedNote(req.userId, noteId);
        res.json({ access: purchased });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check access' });
    }
});

module.exports = router;
