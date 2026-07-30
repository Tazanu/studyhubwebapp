const express = require('express');
const path = require('path');
const prisma = require('../prisma');
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// ===================== GET ALL NOTES =====================
router.get('/', async (req, res) => {
    try {
        const { subject, group_id, uploaded_by } = req.query;

        const where = { is_active: true };
        if (subject) where.subject = subject;
        if (group_id) where.group_id = parseInt(group_id);
        if (uploaded_by) where.uploaded_by = parseInt(uploaded_by);

        const notes = await prisma.notes.findMany({
            where,
            include: {
                users: {
                    select: { id: true, first_name: true, last_name: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        res.json(notes);
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// ===================== GET SINGLE NOTE =====================
router.get('/:id', async (req, res) => {
    try {
        const note = await prisma.notes.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                users: {
                    select: { id: true, first_name: true, last_name: true }
                },
                groups: {
                    select: { id: true, name: true }
                }
            }
        });

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.json(note);
    } catch (error) {
        console.error('Get note error:', error);
        res.status(500).json({ error: 'Failed to fetch note' });
    }
});

// ===================== UPLOAD NOTE =====================
router.post('/', authenticate, upload.single('file'), async (req, res) => {
    try {
        const { title, description, subject, groupId, isPremium, price, tags } = req.body;

        if (!title || !description || !subject) {
            return res.status(400).json({ error: 'Title, description, and subject are required' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'A file is required' });
        }

        if (isPremium === 'true') {
            const tutor = await prisma.tutors.findFirst({ where: { user_id: req.userId, status: 'approved' } });
            const user  = await prisma.users.findUnique({ where: { id: req.userId }, select: { role: true } });
            if (!tutor && user?.role !== 'admin') {
                return res.status(403).json({ error: 'Only approved tutors and admins can upload premium notes' });
            }
        }

        const note = await prisma.notes.create({
            data: {
                title,
                description,
                subject,
                file_path: req.file.path,
                file_type: req.file.mimetype.startsWith('image/') ? req.file.mimetype.split('/')[1] : path.extname(req.file.originalname).replace('.', ''),
                uploaded_by: req.userId,
                group_id: groupId ? parseInt(groupId) : null,
                is_premium: isPremium === 'true',
                price: isPremium === 'true' ? parseFloat(price) || 0 : 0,
                tags: tags ? tags.split(',').map(t => t.trim()) : []
            }
        });

        res.status(201).json({ success: true, note });
    } catch (error) {
        console.error('Upload note error:', error);
        res.status(500).json({ error: 'Failed to upload note' });
    }
});

// ===================== DOWNLOAD NOTE (increment counter) =====================
router.post('/:id/download', async (req, res) => {
    try {
        const note = await prisma.notes.update({
            where: { id: parseInt(req.params.id) },
            data: { downloads: { increment: 1 } }
        });

        res.json({ success: true, file_path: note.file_path });
    } catch (error) {
        console.error('Download note error:', error);
        res.status(500).json({ error: 'Failed to process download' });
    }
});

// ===================== PROXY NOTE FILE =====================
router.get('/:id/file', async (req, res) => {
    try {
        const note = await prisma.notes.findUnique({ where: { id: parseInt(req.params.id) } });
        if (!note) return res.status(404).json({ error: 'Note not found' });

        const ext = (note.file_type || '').toLowerCase();
        const contentType = ext === 'pdf' ? 'application/pdf'
            : ['jpg','jpeg'].includes(ext) ? 'image/jpeg'
            : ext === 'png' ? 'image/png'
            : ext === 'gif' ? 'image/gif'
            : ext === 'webp' ? 'image/webp'
            : 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${note.title}.${ext}"`);

        if (!note.file_path.startsWith('http')) {
            return res.status(410).json({ error: 'File no longer available. Please re-upload.' });
        }

        const axios = require('axios');
        const response = await axios.get(note.file_path, {
            responseType: 'stream',
            headers: { 'User-Agent': 'StudyHub/1.0' }
        });
        response.data.pipe(res);
    } catch (error) {
        console.error('File proxy error:', error.message, error.response?.status);
        res.status(500).json({ error: 'Failed to fetch file', detail: error.message });
    }
});

// ===================== DELETE NOTE =====================
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const note = await prisma.notes.findUnique({ where: { id: parseInt(req.params.id) } });

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        if (note.uploaded_by !== req.userId) {
            const user = await prisma.users.findUnique({ where: { id: req.userId }, select: { role: true } });
            if (user?.role !== 'admin') {
                return res.status(403).json({ error: 'Not authorized to delete this note' });
            }
        }

        await prisma.notes.delete({ where: { id: parseInt(req.params.id) } });

        res.json({ success: true, message: 'Note deleted' });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

module.exports = router;