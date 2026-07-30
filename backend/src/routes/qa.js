const express = require('express');
const prisma = require('../prisma');
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// ==================== GET USER'S BOOKMARKED QUESTIONS ====================
router.get('/user/bookmarks', authenticate, async (req, res) => {
    try {
        const bookmarks = await prisma.question_bookmarks.findMany({
            where: { user_id: req.userId },
            include: {
                questions: {
                    include: {
                        users: { select: { id: true, first_name: true, last_name: true, profile_picture: true, reputation: true } }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        res.json(bookmarks.map(b => b.questions));
    } catch (error) {
        console.error('Get bookmarks error:', error);
        res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
});

// ==================== GET CATEGORIES ====================
router.get('/meta/categories', async (req, res) => {
    try {
        const categories = await prisma.questions.findMany({
            where: { category: { not: null } },
            select: { category: true, subject: true },
            distinct: ['category']
        });

        const grouped = categories.reduce((acc, q) => {
            if (!acc[q.subject]) acc[q.subject] = [];
            if (!acc[q.subject].includes(q.category)) {
                acc[q.subject].push(q.category);
            }
            return acc;
        }, {});

        res.json(grouped);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// ==================== GET ALL QUESTIONS ====================
router.get('/', async (req, res) => {
    try {
        const { category, subject, tag, search, sort = 'recent', page = 1, limit = 20, author_id } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (author_id) where.author_id = parseInt(author_id);
        if (category) where.category = category;
        if (subject) where.subject = subject;
        if (tag) where.tags = { has: tag };
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } }
            ];
        }

        let orderBy = { created_at: 'desc' };
        if (sort === 'votes') orderBy = { votes: 'desc' };
        if (sort === 'unanswered') where.answers_count = 0;
        if (sort === 'solved') where.is_solved = true;

        const [questions, total] = await Promise.all([
            prisma.questions.findMany({
                where,
                include: {
                    users: { select: { id: true, first_name: true, last_name: true, profile_picture: true, reputation: true } },
                    _count: { select: { answers: true } }
                },
                orderBy,
                skip,
                take: parseInt(limit)
            }),
            prisma.questions.count({ where })
        ]);

        res.json({
            questions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});

// ==================== GET SINGLE QUESTION ====================
router.get('/:id', async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);

        // Increment views
        await prisma.questions.update({
            where: { id: questionId },
            data: { views: { increment: 1 } }
        });

        const question = await prisma.questions.findUnique({
            where: { id: questionId },
            include: {
                users: { select: { id: true, first_name: true, last_name: true, profile_picture: true, reputation: true } },
                answers: {
                    include: {
                        users: { select: { id: true, first_name: true, last_name: true, profile_picture: true, reputation: true } },
                        answer_comments: {
                            include: {
                                users: { select: { id: true, first_name: true, last_name: true, profile_picture: true } }
                            },
                            orderBy: { created_at: 'asc' }
                        },
                        _count: { select: { answer_votes: true } }
                    },
                    orderBy: [
                        { is_accepted: 'desc' },
                        { votes: 'desc' },
                        { created_at: 'asc' }
                    ]
                }
            }
        });

        if (!question) return res.status(404).json({ error: 'Question not found' });

        // Get user's vote status if authenticated
        if (req.headers.authorization) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(
                    req.headers.authorization.split(' ')[1],
                    process.env.JWT_SECRET || 'your-super-secret-jwt-key'
                );
                const userId = decoded.userId;

                const [questionVote, bookmark, following] = await Promise.all([
                    prisma.question_votes.findFirst({
                        where: { user_id: userId, question_id: questionId }
                    }),
                    prisma.question_bookmarks.findFirst({
                        where: { user_id: userId, question_id: questionId }
                    }),
                    prisma.question_followers.findFirst({
                        where: { user_id: userId, question_id: questionId }
                    })
                ]);

                question.userVote = questionVote?.vote_type || 0;
                question.isBookmarked = !!bookmark;
                question.isFollowing = !!following;
            } catch {}
        }

        res.json(question);
    } catch (error) {
        console.error('Get question error:', error);
        res.status(500).json({ error: 'Failed to fetch question' });
    }
});

// ==================== POST QUESTION ====================
router.post('/', authenticate, upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'images', maxCount: 5 }]), async (req, res) => {
    try {
        const { title, content, subject, category, tags } = req.body;

        if (!title || !content || !subject) {
            return res.status(400).json({ error: 'Title, content, and subject are required' });
        }

        const data = {
            title: title.trim(),
            content: content.trim(),
            subject,
            category: category || null,
            tags: tags ? JSON.parse(tags) : [],
            author_id: req.userId
        };

        if (req.files?.audio) {
            data.audio_url = req.files.audio[0].path;
        }

        if (req.files?.images) {
            data.images = req.files.images.map(f => f.path);
        }

        const question = await prisma.questions.create({
            data,
            include: {
                users: { select: { id: true, first_name: true, last_name: true, profile_picture: true, reputation: true } }
            }
        });

        // Award reputation for asking question
        await prisma.users.update({
            where: { id: req.userId },
            data: { reputation: { increment: 5 } }
        });

        res.status(201).json({ success: true, question });
    } catch (error) {
        console.error('Post question error:', error);
        res.status(500).json({ error: 'Failed to post question' });
    }
});

// ==================== UPDATE QUESTION ====================
router.patch('/:id', authenticate, upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'images', maxCount: 5 }]), async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);
        const { title, content, subject, category, tags } = req.body;

        const existing = await prisma.questions.findUnique({ where: { id: questionId } });
        if (!existing) return res.status(404).json({ error: 'Question not found' });
        if (existing.author_id !== req.userId) return res.status(403).json({ error: 'Not authorized' });

        const data = { is_edited: true };
        if (title) data.title = title.trim();
        if (content) data.content = content.trim();
        if (subject) data.subject = subject;
        if (category !== undefined) data.category = category;
        if (tags) data.tags = JSON.parse(tags);

        if (req.files?.audio) {
            data.audio_url = req.files.audio[0].path;
        }

        if (req.files?.images) {
            data.images = req.files.images.map(f => f.path);
        }

        const updated = await prisma.questions.update({
            where: { id: questionId },
            data,
            include: {
                users: { select: { id: true, first_name: true, last_name: true, profile_picture: true, reputation: true } }
            }
        });

        res.json({ success: true, question: updated });
    } catch (error) {
        console.error('Update question error:', error);
        res.status(500).json({ error: 'Failed to update question' });
    }
});

// ==================== DELETE QUESTION ====================
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);
        const question = await prisma.questions.findUnique({ where: { id: questionId } });

        if (!question) return res.status(404).json({ error: 'Question not found' });
        if (question.author_id !== req.userId) return res.status(403).json({ error: 'Not authorized' });

        await prisma.questions.delete({ where: { id: questionId } });
        res.json({ success: true, message: 'Question deleted' });
    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({ error: 'Failed to delete question' });
    }
});

// ==================== VOTE ON QUESTION ====================
router.post('/:id/vote', authenticate, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);
        const { voteType } = req.body; // 1 for upvote, -1 for downvote

        if (![1, -1].includes(voteType)) {
            return res.status(400).json({ error: 'Invalid vote type' });
        }

        const question = await prisma.questions.findUnique({ where: { id: questionId } });
        if (!question) return res.status(404).json({ error: 'Question not found' });

        const existing = await prisma.question_votes.findFirst({
            where: { user_id: req.userId, question_id: questionId }
        });

        let voteChange = 0;
        let repChange = 0;

        if (existing) {
            if (existing.vote_type === voteType) {
                // Remove vote
                await prisma.question_votes.deleteMany({
                    where: { user_id: req.userId, question_id: questionId }
                });
                voteChange = -voteType;
                repChange = voteType === 1 ? -10 : 5;
            } else {
                // Change vote
                await prisma.question_votes.updateMany({
                    where: { user_id: req.userId, question_id: questionId },
                    data: { vote_type: voteType }
                });
                voteChange = voteType * 2;
                repChange = voteType === 1 ? 15 : -5;
            }
        } else {
            // New vote
            await prisma.question_votes.create({
                data: { user_id: req.userId, question_id: questionId, vote_type: voteType }
            });
            voteChange = voteType;
            repChange = voteType === 1 ? 10 : -5;
        }

        // Update question votes and author reputation
        await Promise.all([
            prisma.questions.update({
                where: { id: questionId },
                data: { votes: { increment: voteChange } }
            }),
            prisma.users.update({
                where: { id: question.author_id },
                data: { reputation: { increment: repChange } }
            })
        ]);

        res.json({ success: true, voteChange });
    } catch (error) {
        console.error('Vote question error:', error);
        res.status(500).json({ error: 'Failed to vote' });
    }
});

// ==================== BOOKMARK QUESTION ====================
router.post('/:id/bookmark', authenticate, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);

        const existing = await prisma.question_bookmarks.findFirst({
            where: { user_id: req.userId, question_id: questionId }
        });

        if (existing) {
            await prisma.question_bookmarks.deleteMany({
                where: { user_id: req.userId, question_id: questionId }
            });
            res.json({ success: true, bookmarked: false });
        } else {
            await prisma.question_bookmarks.create({
                data: { user_id: req.userId, question_id: questionId }
            });
            res.json({ success: true, bookmarked: true });
        }
    } catch (error) {
        console.error('Bookmark error:', error);
        res.status(500).json({ error: 'Failed to bookmark' });
    }
});

// ==================== FOLLOW QUESTION ====================
router.post('/:id/follow', authenticate, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);

        const existing = await prisma.question_followers.findFirst({
            where: { user_id: req.userId, question_id: questionId }
        });

        if (existing) {
            await prisma.question_followers.deleteMany({
                where: { user_id: req.userId, question_id: questionId }
            });
            res.json({ success: true, following: false });
        } else {
            await prisma.question_followers.create({
                data: { user_id: req.userId, question_id: questionId }
            });
            res.json({ success: true, following: true });
        }
    } catch (error) {
        console.error('Follow error:', error);
        res.status(500).json({ error: 'Failed to follow' });
    }
});

// ==================== POST ANSWER ====================
router.post('/:id/answers', authenticate, upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'images', maxCount: 5 }]), async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Answer content is required' });
        }

        const question = await prisma.questions.findUnique({ where: { id: questionId } });
        if (!question) return res.status(404).json({ error: 'Question not found' });

        const data = {
            content: content.trim(),
            question_id: questionId,
            author_id: req.userId
        };

        if (req.files?.audio) {
            data.audio_url = req.files.audio[0].path;
        }

        if (req.files?.images) {
            data.images = req.files.images.map(f => f.path);
        }

        const answer = await prisma.answers.create({
            data,
            include: {
                users: { select: { id: true, first_name: true, last_name: true, profile_picture: true, reputation: true } }
            }
        });

        // Update question answer count and award reputation
        await Promise.all([
            prisma.questions.update({
                where: { id: questionId },
                data: { answers_count: { increment: 1 } }
            }),
            prisma.users.update({
                where: { id: req.userId },
                data: { reputation: { increment: 10 } }
            })
        ]);

        // Notify question author and followers
        const followers = await prisma.question_followers.findMany({
            where: { question_id: questionId },
            select: { user_id: true }
        });

        const notificationUserIds = [...new Set([question.author_id, ...followers.map(f => f.user_id)])].filter(id => id !== req.userId);

        const answerer = await prisma.users.findUnique({
            where: { id: req.userId },
            select: { first_name: true, last_name: true }
        });

        await Promise.all(
            notificationUserIds.map(userId =>
                prisma.notifications.create({
                    data: {
                        user_id: userId,
                        type: 'new_answer',
                        message: `${answerer.first_name} ${answerer.last_name} answered: ${question.title}`
                    }
                })
            )
        );

        res.status(201).json({ success: true, answer });
    } catch (error) {
        console.error('Post answer error:', error);
        res.status(500).json({ error: 'Failed to post answer' });
    }
});

// ==================== ACCEPT ANSWER ====================
router.post('/:id/answers/:answerId/accept', authenticate, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);
        const answerId = parseInt(req.params.answerId);

        const question = await prisma.questions.findUnique({ where: { id: questionId } });
        if (!question) return res.status(404).json({ error: 'Question not found' });
        if (question.author_id !== req.userId) return res.status(403).json({ error: 'Only question author can accept answers' });

        const answer = await prisma.answers.findUnique({ where: { id: answerId } });
        if (!answer || answer.question_id !== questionId) {
            return res.status(404).json({ error: 'Answer not found' });
        }

        // Unaccept other answers and accept this one
        await prisma.$transaction([
            prisma.answers.updateMany({
                where: { question_id: questionId },
                data: { is_accepted: false }
            }),
            prisma.answers.update({
                where: { id: answerId },
                data: { is_accepted: true }
            }),
            prisma.questions.update({
                where: { id: questionId },
                data: { is_solved: true }
            }),
            prisma.users.update({
                where: { id: answer.author_id },
                data: { reputation: { increment: 25 } }
            })
        ]);

        res.json({ success: true, message: 'Answer accepted' });
    } catch (error) {
        console.error('Accept answer error:', error);
        res.status(500).json({ error: 'Failed to accept answer' });
    }
});

// ==================== VOTE ON ANSWER ====================
router.post('/:questionId/answers/:answerId/vote', authenticate, async (req, res) => {
    try {
        const answerId = parseInt(req.params.answerId);
        const { voteType } = req.body;

        if (![1, -1].includes(voteType)) {
            return res.status(400).json({ error: 'Invalid vote type' });
        }

        const answer = await prisma.answers.findUnique({ where: { id: answerId } });
        if (!answer) return res.status(404).json({ error: 'Answer not found' });

        const existing = await prisma.answer_votes.findFirst({
            where: { user_id: req.userId, answer_id: answerId }
        });

        let voteChange = 0;
        let repChange = 0;

        if (existing) {
            if (existing.vote_type === voteType) {
                await prisma.answer_votes.deleteMany({
                    where: { user_id: req.userId, answer_id: answerId }
                });
                voteChange = -voteType;
                repChange = voteType === 1 ? -10 : 5;
            } else {
                await prisma.answer_votes.updateMany({
                    where: { user_id: req.userId, answer_id: answerId },
                    data: { vote_type: voteType }
                });
                voteChange = voteType * 2;
                repChange = voteType === 1 ? 15 : -5;
            }
        } else {
            await prisma.answer_votes.create({
                data: { user_id: req.userId, answer_id: answerId, vote_type: voteType }
            });
            voteChange = voteType;
            repChange = voteType === 1 ? 10 : -5;
        }

        await Promise.all([
            prisma.answers.update({
                where: { id: answerId },
                data: { votes: { increment: voteChange } }
            }),
            prisma.users.update({
                where: { id: answer.author_id },
                data: { reputation: { increment: repChange } }
            })
        ]);

        res.json({ success: true, voteChange });
    } catch (error) {
        console.error('Vote answer error:', error);
        res.status(500).json({ error: 'Failed to vote' });
    }
});

// ==================== COMMENT ON ANSWER ====================
router.post('/:questionId/answers/:answerId/comments', authenticate, async (req, res) => {
    try {
        const answerId = parseInt(req.params.answerId);
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Comment content is required' });
        }

        const comment = await prisma.answer_comments.create({
            data: {
                answer_id: answerId,
                user_id: req.userId,
                content: content.trim()
            },
            include: {
                users: { select: { id: true, first_name: true, last_name: true, profile_picture: true } }
            }
        });

        res.status(201).json({ success: true, comment });
    } catch (error) {
        console.error('Comment error:', error);
        res.status(500).json({ error: 'Failed to post comment' });
    }
});

module.exports = router;
