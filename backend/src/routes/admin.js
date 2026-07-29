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
