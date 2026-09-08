const express = require('express');
const path = require('path');
const prisma = require('../prisma');
const authenticate = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const upload = require('../middleware/upload');
const { storedPathFor } = require('../middleware/upload');
const { hasPurchasedPaidNote } = require('../services/entitlements');
const { protectFile, streamFile, isRemote, publicUrlFor } = require('../services/fileAccess');
const parseTags = require('../lib/parseTags');

const router = express.Router();

/**
 * Does `userId` have the right to the file behind `note`?
 * Free notes are open; premium notes need ownership, an admin role, or a
 * completed purchase transaction.
 */
async function canAccessNote(userId, note) {
    if (!note.is_premium) return true;
    if (!userId) return false;
    if (note.uploaded_by === userId) return true;

    const user = await prisma.users.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'admin') return true;

    return hasPurchasedPaidNote(userId, note.id);
}

/**
 * Shape a note for the client. Premium notes never carry their storage path —
 * even for someone who has paid — because the bytes are served through the
 * entitlement-checked route instead. Free notes keep their path.
 */
function presentNote(note, unlocked) {
    if (!note.is_premium) return { ...note, purchased: true, locked: false };
    const { file_path, ...safe } = note;
    return { ...safe, purchased: !!unlocked, locked: !unlocked };
}

// ===================== GET ALL NOTES =====================
router.get('/', optionalAuth, async (req, res) => {
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

        const presented = await Promise.all(
            notes.map(async n => presentNote(n, await canAccessNote(req.userId, n)))
        );

        res.json(presented);
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// ===================== GET SINGLE NOTE =====================
router.get('/:id', optionalAuth, async (req, res) => {
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

        res.json(presentNote(note, await canAccessNote(req.userId, note)));
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

        // Paid content must not be publicly fetchable, so take it out of the
        // public namespace before the record exists.
        let storedPath = storedPathFor(req.file);
        if (isPremium === 'true') {
            try {
                storedPath = await protectFile(storedPath);
            } catch (e) {
                console.error('Failed to protect premium upload:', e.message);
            }
        }

        const note = await prisma.notes.create({
            data: {
                title,
                description,
                subject,
                file_path: storedPath,
                file_type: req.file.mimetype.startsWith('image/') ? req.file.mimetype.split('/')[1] : path.extname(req.file.originalname).replace('.', ''),
                uploaded_by: req.userId,
                group_id: groupId ? parseInt(groupId) : null,
                is_premium: isPremium === 'true',
                price: isPremium === 'true' ? parseFloat(price) || 0 : 0,
                tags: parseTags(tags)
            }
        });

        res.status(201).json({ success: true, note: presentNote(note, true) });
    } catch (error) {
        console.error('Upload note error:', error);
        res.status(500).json({ error: 'Failed to upload note' });
    }
});

// ===================== DOWNLOAD NOTE (increment counter) =====================
router.post('/:id/download', authenticate, async (req, res) => {
    try {
        const noteId = parseInt(req.params.id);
        if (!noteId) return res.status(400).json({ error: 'Invalid note ID' });

        const existing = await prisma.notes.findUnique({ where: { id: noteId } });
        if (!existing) return res.status(404).json({ error: 'Note not found' });

        if (!(await canAccessNote(req.userId, existing))) {
            return res.status(402).json({ error: 'Purchase this note to download it' });
        }

        const note = await prisma.notes.update({
            where: { id: noteId },
            data: { downloads: { increment: 1 } }
        });

        // Premium content is fetched through the gated route; only free notes
        // hand back a directly usable path.
        res.json({
            success: true,
            downloadPath: `/notes/${noteId}/file`,
            file_path: note.is_premium ? undefined : note.file_path,
        });
    } catch (error) {
        console.error('Download note error:', error);
        res.status(500).json({ error: 'Failed to process download' });
    }
});

// ===================== PROXY NOTE FILE =====================
router.get('/:id/file', optionalAuth, async (req, res) => {
    try {
        const note = await prisma.notes.findUnique({ where: { id: parseInt(req.params.id) } });
        if (!note) return res.status(404).json({ error: 'Note not found' });

        if (!(await canAccessNote(req.userId, note))) {
            return res.status(402).json({ error: 'Purchase this note to view it' });
        }

        // A free note has nothing to hide, so send the browser straight to the
        // CDN instead of relaying every byte through this process. That halves
        // the number of hops, and — because Cloudinary honours range requests —
        // lets a PDF viewer paint page one long before the file finishes
        // downloading. Premium notes deliberately skip this: their bytes must
        // keep flowing through the entitlement check.
        const wantsDownload = req.query.download === '1';
        const cdnUrl = !note.is_premium && isRemote(note.file_path)
            ? publicUrlFor(note.file_path, {
                attachmentName: wantsDownload ? note.title : undefined,
              })
            : null;
        if (cdnUrl) return res.redirect(302, cdnUrl);

        // Everything else is relayed: premium notes (gated, never cached) and
        // free notes still on local disk or behind authenticated delivery.
        return streamFile(res, note.file_path, {
            filename: note.title,
            fileType: note.file_type,
            download: wantsDownload,
            cacheControl: note.is_premium
                ? 'private, no-store'
                : 'public, max-age=86400',
        });
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