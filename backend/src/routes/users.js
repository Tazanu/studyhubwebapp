const express = require('express');
const prisma = require('../prisma');
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// ===================== GET LEADERBOARD =====================
router.get('/leaderboard/top', async (req, res) => {
    try {
        const users = await prisma.users.findMany({
            where: { is_active: true },
            select: { id: true, first_name: true, last_name: true, university: true, reputation: true, profile_picture: true },
            orderBy: { reputation: 'desc' },
            take: 10,
        });
        res.set('Cache-Control', 'public, max-age=60');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// ===================== PATCH PROFILE =====================
router.patch('/profile', authenticate, upload.single('profile_picture'), async (req, res) => {
    try {
        const { firstName, lastName, university, fieldOfStudy, bio } = req.body;
        const data = {};
        if (firstName)    data.first_name    = firstName.trim();
        if (lastName)     data.last_name     = lastName.trim();
        if (university)   data.university    = university.trim();
        if (fieldOfStudy) data.field_of_study = fieldOfStudy.trim();
        if (bio !== undefined) data.bio      = bio.trim().slice(0, 300);
        if (req.file)     data.profile_picture = req.file.path;

        const user = await prisma.users.update({
            where: { id: req.userId },
            data,
            select: {
                id: true, email: true, first_name: true, last_name: true,
                university: true, field_of_study: true, role: true,
                reputation: true, profile_picture: true, bio: true,
                is_active: true, created_at: true,
            },
        });
        res.json({ success: true, user });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ===================== GET USER STATS =====================
router.get('/:id/stats', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        const [
            groupsJoined,
            notesUploaded,
            questionsAsked,
            answersGiven,
            acceptedAnswers,
            noteDownloads,
            user,
            tutor,
        ] = await Promise.all([
            prisma.user_groups.count({ where: { user_id: userId } }),
            prisma.notes.count({ where: { uploaded_by: userId, is_active: true } }),
            prisma.questions.count({ where: { author_id: userId } }),
            prisma.answers.count({ where: { author_id: userId } }),
            prisma.answers.count({ where: { author_id: userId, is_accepted: true } }),
            prisma.notes.aggregate({ where: { uploaded_by: userId, is_active: true }, _sum: { downloads: true } }),
            prisma.users.findUnique({ where: { id: userId }, select: { reputation: true } }),
            prisma.tutors.findFirst({ where: { user_id: userId, status: 'approved' } }),
        ]);

        res.json({
            groupsJoined,
            notesUploaded,
            questionsAsked,
            answersGiven,
            acceptedAnswers,
            totalDownloads: noteDownloads._sum.downloads || 0,
            reputation: user?.reputation || 0,
            isTutor: !!tutor,
        });
    } catch (error) {
        console.error('Get user stats error:', error.message);
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
});

// ===================== GET USER PUBLIC PROFILE =====================
router.get('/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                university: true,
                field_of_study: true,
                role: true,
                reputation: true,
                profile_picture: true,
                bio: true,
                created_at: true,
                tutors: { select: { status: true } },
            },
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// ===================== GET USER ANSWERS =====================
router.get('/:id/answers', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const answers = await prisma.answers.findMany({
            where: { author_id: userId },
            include: {
                questions: { select: { id: true, title: true, subject: true } },
            },
            orderBy: { created_at: 'desc' },
            take: 20,
        });
        res.json(answers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch answers' });
    }
});

module.exports = router;
