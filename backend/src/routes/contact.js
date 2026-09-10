const express = require('express');
const prisma = require('../prisma');
const adminAuth = require('../middleware/admin');
const honeypot = require('../middleware/honeypot');

const router = express.Router();

const LIMITS = { name: 120, email: 200, subject: 160, message: 4000 };

/**
 * Public contact form.
 *
 * Deliberately unauthenticated — someone who cannot sign in is exactly the
 * person most likely to need it. Protected by the shared honeypot and by the
 * API rate limiter rather than by a login.
 */
router.post('/', honeypot, async (req, res) => {
    try {
        const name = String(req.body?.name || '').trim();
        const email = String(req.body?.email || '').trim();
        const subject = String(req.body?.subject || '').trim();
        const message = String(req.body?.message || '').trim();

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email and message are required.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            return res.status(400).json({ error: 'Enter a valid email address so we can reply.' });
        }
        if (message.length < 15) {
            return res.status(400).json({ error: 'Please give a little more detail so we can help.' });
        }
        for (const [field, max] of Object.entries(LIMITS)) {
            const value = { name, email, subject, message }[field];
            if (value.length > max) {
                return res.status(400).json({ error: `${field[0].toUpperCase()}${field.slice(1)} is too long (max ${max} characters).` });
            }
        }

        const saved = await prisma.contact_messages.create({
            data: {
                name, email,
                subject: subject || 'No subject',
                message,
                ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim().slice(0, 64),
            },
        });

        // Tell the admins in-app. Failing to notify must not lose the message,
        // which is already safely stored by this point.
        try {
            const admins = await prisma.users.findMany({ where: { role: 'admin' }, select: { id: true } });
            await prisma.notifications.createMany({
                data: admins.map(a => ({
                    user_id: a.id,
                    type: 'contact_message',
                    message: `New message from ${name} (${email}): ${subject || 'No subject'}`.slice(0, 500),
                })),
            });
        } catch (e) {
            console.error('Contact notification failed:', e.message);
        }

        res.status(201).json({
            success: true,
            id: saved.id,
            message: 'Thanks — your message has been received. We usually reply within a day or two.',
        });
    } catch (err) {
        console.error('Contact form error:', err);
        res.status(500).json({ error: 'Could not send your message. Please try again, or email us directly.' });
    }
});

// ── Admin ────────────────────────────────────────────────────────────────────
router.get('/messages', adminAuth, async (req, res) => {
    try {
        const messages = await prisma.contact_messages.findMany({
            orderBy: [{ is_read: 'asc' }, { created_at: 'desc' }],
            take: 200,
        });
        res.json(messages);
    } catch (err) {
        console.error('Fetch contact messages error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

router.patch('/messages/:id/read', adminAuth, async (req, res) => {
    try {
        const updated = await prisma.contact_messages.update({
            where: { id: Number(req.params.id) },
            data: { is_read: true, handled_at: new Date() },
            select: { id: true, is_read: true },
        });
        res.json(updated);
    } catch (err) {
        console.error('Mark contact message read error:', err);
        res.status(500).json({ error: 'Failed to update message' });
    }
});

module.exports = router;
