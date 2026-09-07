const express = require('express');
const path = require('path');
const prisma = require('../prisma');
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');
const { storedPathFor } = require('../middleware/upload');
const { validatePayer, initiateCollect, checkStatus } = require('../services/mobileMoney');
const { protectFile, streamFile } = require('../services/fileAccess');
const {
    OrderError,
    resolveOrder,
    completeOrder,
    failOrder,
    describeGranted,
    hasActiveSubscription,
    hasPurchasedPremiumNote,
} = require('../services/entitlements');

const router = express.Router();

// How long a pending payment may sit before we give up on it.
const PAYMENT_TTL_MS = 5 * 60 * 1000;

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
        console.error('Subscription status error:', err);
        res.status(500).json({ error: 'Failed to check subscription' });
    }
});

// ── POST /premium/pay/initiate ────────────────────────────────────────────────
// Amounts are resolved server-side by resolveOrder; the client never sends one.
// Returns immediately with a txId, then the client polls /pay/status/:txId while
// the payer approves the USSD prompt.
router.post('/pay/initiate', authenticate, async (req, res) => {
    try {
        const { service, payer, type, noteId } = req.body;

        const check = validatePayer(service, payer);
        if (!check.ok) return res.status(400).json({ error: check.error });

        const order = await resolveOrder(req.userId, { type, noteId });
        if (!(order.amount > 0)) {
            return res.status(400).json({ error: 'This item has no price set. Contact support.' });
        }

        const tx = await prisma.transactions.create({
            data: {
                user_id: req.userId,
                amount: order.amount,
                type: order.type,
                status: 'pending',
                description: order.description,
                metadata: order.metadata,
            },
        });

        let reference;
        try {
            reference = await initiateCollect({
                amount: order.amount,
                service: check.service,
                payer: check.payer,
                description: order.description,
                externalId: tx.id,
            });
        } catch (mesombErr) {
            await failOrder(tx.id);
            console.error('MeSomb initiate error:', mesombErr.message);
            return res.status(502).json({ error: 'Could not reach the payment provider. Please try again.' });
        }

        await prisma.transactions.update({ where: { id: tx.id }, data: { reference } });

        res.json({
            success: true,
            txId: tx.id,
            mesombRef: reference,
            amount: order.amount,
            message: 'Check your phone and enter your PIN to approve the payment.',
        });
    } catch (err) {
        if (err instanceof OrderError) return res.status(err.status).json({ error: err.message });
        console.error('Initiate payment error:', err);
        res.status(500).json({ error: 'Failed to initiate payment' });
    }
});

// ── GET /premium/pay/status/:txId ─────────────────────────────────────────────
// Polled by the Premium page. Granting is idempotent, so overlapping polls are
// safe: exactly one of them performs the grant.
router.get('/pay/status/:txId', authenticate, async (req, res) => {
    try {
        const txId = parseInt(req.params.txId);
        if (!txId) return res.status(400).json({ error: 'Invalid transaction ID' });

        const tx = await prisma.transactions.findUnique({ where: { id: txId } });
        if (!tx || tx.user_id !== req.userId) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (tx.status === 'completed') {
            return res.json({ status: 'completed', ...(await describeGranted(tx)) });
        }
        if (tx.status === 'failed') {
            return res.json({ status: 'failed', error: 'Payment was declined or timed out.' });
        }

        const age = Date.now() - new Date(tx.created_at).getTime();

        // No reference means the provider never accepted the request, so there
        // is nothing to poll — expire it rather than stranding the row.
        if (!tx.reference) {
            if (age > PAYMENT_TTL_MS) {
                await failOrder(txId);
                return res.json({ status: 'failed', error: 'Payment could not be started. Please try again.' });
            }
            return res.json({ status: 'pending' });
        }

        let providerStatus;
        try {
            providerStatus = await checkStatus(tx.reference);
        } catch (e) {
            console.error('checkStatus error:', e.message);
            return res.json({ status: 'pending' }); // transient — keep polling
        }

        if (providerStatus === 'SUCCESS') {
            const granted = await completeOrder(txId);
            return res.json({ status: 'completed', ...granted });
        }

        if (providerStatus === 'FAILED') {
            await failOrder(txId);
            return res.json({ status: 'failed', error: 'Payment was declined. Please try again.' });
        }

        // Do NOT mark it failed here - the payer may still be approving, and the
        // money could land after the page gives up. The background reconciler
        // settles it either way.
        if (age > PAYMENT_TTL_MS) {
            return res.json({
                status: 'processing',
                message: 'Still waiting on the operator. If you approved the payment, access is granted automatically within a few minutes.',
            });
        }

        res.json({ status: 'pending' });
    } catch (err) {
        if (err instanceof OrderError) return res.status(err.status).json({ error: err.message });
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
        console.error('Receipt error:', err);
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

        // A token can outlive its user (deleted account, restored database), so
        // treat a missing record as an ordinary signed-in user rather than
        // throwing on `user.role`.
        const user = await getUser(req.userId);
        const isAdmin = user?.role === 'admin';

        const result = notes.map(n => {
            // Free access: admins (everything) and each note's own uploader
            // (their own notes only). Everyone else must buy it.
            const purchased = isAdmin || n.uploaded_by === req.userId || purchasedIds.has(n.id);
            // Never ship the storage path — access is through /notes/:id/file.
            const { file_path, ...safe } = n;
            return { ...safe, purchased };
        });

        res.json(result);
    } catch (err) {
        console.error('Fetch premium notes error:', err);
        res.status(500).json({ error: 'Failed to fetch premium notes' });
    }
});

// ── POST /premium/notes ───────────────────────────────────────────────────────
router.post('/notes', authenticate, upload.single('file'), async (req, res) => {
    try {
        const user = await getUser(req.userId);
        const isAdmin = user?.role === 'admin';
        const isApprovedTutor = user?.tutors?.status === 'approved';

        if (!isAdmin && !isApprovedTutor) {
            return res.status(403).json({ error: 'Only approved tutors can post premium notes' });
        }

        const { title, description, subject, price, tags } = req.body;
        if (!title || !description || !subject) {
            return res.status(400).json({ error: 'Title, description, and subject are required' });
        }
        if (!req.file) return res.status(400).json({ error: 'A file is required' });

        // Paid content must not be publicly fetchable, so take it out of the
        // public namespace before the record exists.
        const rawPath = storedPathFor(req.file);
        let storedPath = rawPath;
        try {
            storedPath = await protectFile(rawPath);
        } catch (e) {
            console.error('Failed to protect premium upload:', e.message);
        }

        const note = await prisma.premium_notes.create({
            data: {
                title,
                description,
                subject,
                file_path: storedPath,
                file_type: path.extname(req.file.originalname).replace('.', ''),
                price: parseFloat(price) || 0,
                tags: tags ? tags.split(',').map(t => t.trim()) : [],
                uploaded_by: req.userId,
            },
        });

        res.status(201).json({ success: true, note: { ...note, file_path: undefined } });
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
        if (user?.role === 'admin') return res.json({ access: true });

        // The uploader always has access to their own note; everyone else
        // (other than admin, above) must have actually paid for it.
        const note = await prisma.premium_notes.findUnique({ where: { id: noteId } });
        if (note?.uploaded_by === req.userId) return res.json({ access: true });

        const purchased = await hasPurchasedPremiumNote(req.userId, noteId);
        res.json({ access: purchased });
    } catch (err) {
        console.error('Premium access check error:', err);
        res.status(500).json({ error: 'Failed to check access' });
    }
});

// ── GET /premium/notes/:id/file ──────────────────────────────────────────────
// Server-side gate for the actual file path. The client must never rely on its
// own `purchased` flag to unlock a download.
router.get('/notes/:id/file', authenticate, async (req, res) => {
    try {
        const noteId = parseInt(req.params.id);
        if (!noteId) return res.status(400).json({ error: 'Invalid note ID' });

        const note = await prisma.premium_notes.findUnique({ where: { id: noteId } });
        if (!note || !note.is_active) return res.status(404).json({ error: 'Note not found' });

        const user = await getUser(req.userId);
        // Free access: admin, or the user who uploaded this specific note.
        // Everyone else needs a completed purchase.
        const allowed =
            user?.role === 'admin' ||
            note.uploaded_by === req.userId ||
            (await hasPurchasedPremiumNote(req.userId, noteId));

        if (!allowed) {
            return res.status(402).json({ error: 'Purchase this note to download it' });
        }

        // Stream the bytes rather than returning a path — the client never gets
        // a durable link to paid content.
        await streamFile(res, note.file_path, {
            filename: note.title,
            fileType: note.file_type,
            download: req.query.download === '1',
        });
    } catch (err) {
        console.error('Premium note file error:', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to fetch note' });
    }
});

module.exports = router;
