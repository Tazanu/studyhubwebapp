const express = require('express');
const path = require('path');
const prisma = require('../prisma');
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');
const { emitNewMessage, emitMessageEdit } = require('../socket');

const router = express.Router();

// In-memory typing status store (groupId -> Map(userId -> lastTypingTime))
// TODO PHASE 3: Remove this once polling endpoints are deprecated
const typingStatus = new Map();

// ===================== GET ALL GROUPS =====================
// Optionally enriches each group with isMember/memberRole/unreadCount for the
// authenticated user when a valid Bearer token is present.
router.get('/', async (req, res) => {
    try {
        const groups = await prisma.groups.findMany({
            where: { is_active: true },
            include: {
                users: { select: { id: true, first_name: true, last_name: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        // Try to enrich with membership info if a token is provided
        let userId = null;
        const auth = req.headers.authorization;
        if (auth && auth.startsWith('Bearer ')) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(
                    auth.split(' ')[1],
                    process.env.JWT_SECRET || 'your-super-secret-jwt-key'
                );
                userId = decoded.userId;
            } catch { /* invalid/expired token — treat as unauthenticated */ }
        }

        if (userId) {
            const memberships = await prisma.user_groups.findMany({
                where: { user_id: userId },
                select: { group_id: true, role: true }
            });
            const memberMap = Object.fromEntries(memberships.map(m => [m.group_id, m.role]));
            
            // Get read statuses for unread counts
            const readStatuses = await prisma.group_read_status.findMany({
                where: { user_id: userId }
            });
            const readMap = Object.fromEntries(
                readStatuses.map(r => [r.group_id, r.last_read_at])
            );
            
            // Calculate unread counts for each group
            const enriched = await Promise.all(groups.map(async g => {
                const lastRead = readMap[g.id] || new Date(0);
                const unreadCount = await prisma.group_messages.count({
                    where: {
                        group_id: g.id,
                        created_at: { gt: lastRead },
                        user_id: { not: userId }
                    }
                });
                
                return {
                    ...g,
                    isMember: g.id in memberMap,
                    memberRole: memberMap[g.id] ?? null,
                    unreadCount
                };
            }));
            return res.json(enriched);
        }

        res.json(groups.map(g => ({ ...g, isMember: false, memberRole: null, unreadCount: 0 })));
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

// ===================== GET SINGLE GROUP =====================
router.get('/:id', async (req, res) => {
    try {
        const group = await prisma.groups.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                users: { select: { id: true, first_name: true, last_name: true } },
                user_groups: {
                    include: {
                        users: { select: { id: true, first_name: true, last_name: true, profile_picture: true } }
                    }
                }
            }
        });
        if (!group) return res.status(404).json({ error: 'Group not found' });
        res.json(group);
    } catch (error) {
        console.error('Get group error:', error);
        res.status(500).json({ error: 'Failed to fetch group' });
    }
});

// ===================== CREATE GROUP =====================
router.post('/', authenticate, async (req, res) => {
    try {
        const { name, description, subject, maxMembers, requiresApproval } = req.body;
        if (!name || !description || !subject) {
            return res.status(400).json({ error: 'Name, description, and subject are required' });
        }

        const group = await prisma.groups.create({
            data: {
                name,
                description,
                subject,
                max_members: maxMembers || 20,
                requires_approval: requiresApproval !== undefined ? requiresApproval : true,
                created_by: req.userId,
                current_members: 1
            }
        });

        await prisma.user_groups.create({
            data: { user_id: req.userId, group_id: group.id, role: 'owner' }
        });

        res.status(201).json({ success: true, group });
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ error: 'Failed to create group' });
    }
});

// ===================== UPDATE GROUP (owner only) =====================
router.patch('/:id', authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const membership = await prisma.user_groups.findUnique({
            where: { user_id_group_id: { user_id: req.userId, group_id: groupId } }
        });
        if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
            return res.status(403).json({ error: 'Only group owners can edit this group' });
        }
        const { name, description, subject, maxMembers } = req.body;
        const updated = await prisma.groups.update({
            where: { id: groupId },
            data: {
                ...(name        && { name }),
                ...(description && { description }),
                ...(subject     && { subject }),
                ...(maxMembers  && { max_members: parseInt(maxMembers) }),
            }
        });
        res.json(updated);
    } catch (error) {
        console.error('Update group error:', error);
        res.status(500).json({ error: 'Failed to update group' });
    }
});

// ===================== DELETE GROUP (owner only) =====================
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const membership = await prisma.user_groups.findUnique({
            where: { user_id_group_id: { user_id: req.userId, group_id: groupId } }
        });
        if (!membership || membership.role !== 'owner') {
            return res.status(403).json({ error: 'Only the group owner can delete this group' });
        }
        await prisma.groups.update({ where: { id: groupId }, data: { is_active: false } });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete group error:', error);
        res.status(500).json({ error: 'Failed to delete group' });
    }
});

// ===================== JOIN GROUP (with approval workflow) =====================
router.post('/:id/join', authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const group = await prisma.groups.findUnique({ where: { id: groupId } });
        if (!group) return res.status(404).json({ error: 'Group not found' });

        // Check if already a member
        const existing = await prisma.user_groups.findUnique({
            where: { user_id_group_id: { user_id: req.userId, group_id: groupId } }
        });
        if (existing) return res.status(400).json({ error: 'Already a member of this group' });

        // Check if group is full
        if (group.current_members >= group.max_members) {
            return res.status(400).json({ error: 'Group is full' });
        }

        // ── APPROVAL WORKFLOW ──
        if (group.requires_approval) {
            // Check for existing request
            const existingRequest = await prisma.group_join_requests.findUnique({
                where: { user_id_group_id: { user_id: req.userId, group_id: groupId } }
            });

            if (existingRequest) {
                if (existingRequest.status === 'pending') {
                    return res.status(400).json({ error: 'Join request already pending', requestStatus: 'pending' });
                }
                if (existingRequest.status === 'approved') {
                    return res.status(400).json({ error: 'Request already approved', requestStatus: 'approved' });
                }
                // If previously denied, allow a new request by updating the existing one
                if (existingRequest.status === 'denied') {
                    await prisma.group_join_requests.update({
                        where: { id: existingRequest.id },
                        data: { status: 'pending', requested_at: new Date(), processed_at: null, processed_by: null }
                    });
                }
            } else {
                // Create new join request
                await prisma.group_join_requests.create({
                    data: { user_id: req.userId, group_id: groupId, status: 'pending' }
                });
            }

            // Notify group admin(s) - find all owners/admins of this group
            const admins = await prisma.user_groups.findMany({
                where: { group_id: groupId, role: 'owner' },
                select: { user_id: true }
            });

            const requester = await prisma.users.findUnique({
                where: { id: req.userId },
                select: { first_name: true, last_name: true }
            });

            // Create notifications for all admins
            await Promise.all(
                admins.map(admin =>
                    prisma.notifications.create({
                        data: {
                            user_id: admin.user_id,
                            type: 'join_request',
                            message: `${requester.first_name} ${requester.last_name} requested to join ${group.name}`,
                            related_group_id: groupId,
                            related_user_id: req.userId
                        }
                    })
                )
            );

            return res.json({ success: true, requestStatus: 'pending', message: 'Join request submitted. Waiting for admin approval.' });
        }

        // ── INSTANT JOIN (no approval required) ──
        await prisma.user_groups.create({
            data: { user_id: req.userId, group_id: groupId, role: 'member' }
        });
        await prisma.groups.update({
            where: { id: groupId },
            data: { current_members: { increment: 1 } }
        });

        res.json({ success: true, message: 'Joined group successfully' });
    } catch (error) {
        console.error('Join group error:', error);
        res.status(500).json({ error: 'Failed to join group' });
    }
});

// ===================== LEAVE GROUP =====================
router.delete('/:id/leave', authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const membership = await prisma.user_groups.findUnique({
            where: { user_id_group_id: { user_id: req.userId, group_id: groupId } }
        });
        if (!membership) return res.status(400).json({ error: 'Not a member of this group' });

        await prisma.user_groups.delete({
            where: { user_id_group_id: { user_id: req.userId, group_id: groupId } }
        });
        await prisma.groups.update({
            where: { id: groupId },
            data: { current_members: { decrement: 1 } }
        });

        res.json({ success: true, message: 'Left group successfully' });
    } catch (error) {
        console.error('Leave group error:', error);
        res.status(500).json({ error: 'Failed to leave group' });
    }
});

// ===================== GET MESSAGES (with optional search) =====================
router.get('/:id/messages', authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const { search } = req.query;

        const membership = await prisma.user_groups.findUnique({
            where: { user_id_group_id: { user_id: req.userId, group_id: groupId } }
        });
        if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });

        const where = { group_id: groupId };
        if (search) {
            where.message = { contains: search, mode: 'insensitive' };
        }

        const messages = await prisma.group_messages.findMany({
            where,
            include: {
                users: { select: { id: true, first_name: true, last_name: true } },
                group_messages: { include: { users: { select: { first_name: true, last_name: true } } } }
            },
            orderBy: { created_at: 'asc' },
            take: 100
        });

        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// ===================== SEND MESSAGE (with optional file) =====================
router.post('/:id/messages', authenticate, upload.single('file'), async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const { message, reply_to } = req.body;

        if ((!message || !message.trim()) && !req.file) {
            return res.status(400).json({ error: 'Message or file is required' });
        }

        const membership = await prisma.user_groups.findUnique({
            where: { user_id_group_id: { user_id: req.userId, group_id: groupId } }
        });
        if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });

        const data = {
            group_id: groupId,
            user_id: req.userId,
            message: message ? message.trim() : '',
        };

        if (req.file) {
            data.file_url = `/uploads/${req.file.filename}`;
            data.file_type = path.extname(req.file.originalname).toLowerCase().replace('.', '');
        }

        if (reply_to) {
            data.reply_to = parseInt(reply_to);
        }

        const created = await prisma.group_messages.create({
            data,
            include: {
                users: { select: { id: true, first_name: true, last_name: true } },
                group_messages: { include: { users: { select: { first_name: true, last_name: true } } } }
            }
        });

        // ── PHASE 1: Emit socket event in addition to REST response ──
        const io = req.app.get('io');
        if (io) {
            emitNewMessage(io, groupId, created);
        }

        res.status(201).json({ success: true, message: created });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// ===================== EDIT MESSAGE =====================
router.patch('/:id/messages/:messageId', authenticate, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        const existing = await prisma.group_messages.findUnique({
            where: { id: parseInt(req.params.messageId) }
        });

        if (!existing) return res.status(404).json({ error: 'Message not found' });
        if (existing.user_id !== req.userId) return res.status(403).json({ error: 'Not authorized' });

        // 15-minute edit window
        const ageMinutes = (Date.now() - new Date(existing.created_at).getTime()) / 1000 / 60;
        if (ageMinutes > 15) {
            return res.status(403).json({ error: 'Edit window expired (15 minutes)' });
        }

        const updated = await prisma.group_messages.update({
            where: { id: parseInt(req.params.messageId) },
            data: { message: message.trim(), is_edited: true },
            include: {
                users: { select: { id: true, first_name: true, last_name: true } },
                group_messages: { include: { users: { select: { first_name: true, last_name: true } } } }
            }
        });

        // ── PHASE 1: Emit socket event in addition to REST response ──
        const io = req.app.get('io');
        if (io) {
            emitMessageEdit(io, parseInt(req.params.id), updated);
        }

        res.json({ success: true, message: updated });
    } catch (error) {
        console.error('Edit message error:', error);
        res.status(500).json({ error: 'Failed to edit message' });
    }
});

// ===================== MARK GROUP AS READ =====================
router.post('/:id/read', authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        
        await prisma.group_read_status.upsert({
            where: {
                user_id_group_id: { user_id: req.userId, group_id: groupId }
            },
            create: {
                user_id: req.userId,
                group_id: groupId,
                last_read_at: new Date()
            },
            update: {
                last_read_at: new Date()
            }
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

// ===================== TYPING INDICATOR - START =====================
router.post('/:id/typing', authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        
        // Verify membership
        const membership = await prisma.user_groups.findUnique({
            where: { user_id_group_id: { user_id: req.userId, group_id: groupId } }
        });
        if (!membership) return res.status(403).json({ error: 'Not a member' });
        
        // Update typing status
        if (!typingStatus.has(groupId)) {
            typingStatus.set(groupId, new Map());
        }
        typingStatus.get(groupId).set(req.userId, Date.now());
        
        // Cleanup expired entries (>5s old)
        const now = Date.now();
        for (const [uid, time] of typingStatus.get(groupId)) {
            if (now - time > 5000) {
                typingStatus.get(groupId).delete(uid);
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Typing indicator error:', error);
        res.status(500).json({ error: 'Failed to update typing status' });
    }
});

// ===================== TYPING INDICATOR - GET =====================
router.get('/:id/typing', authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const now = Date.now();
        const typing = [];
        
        if (typingStatus.has(groupId)) {
            for (const [uid, time] of typingStatus.get(groupId)) {
                // Only include active typers (within 5s) who are not the requester
                if (now - time <= 5000 && uid !== req.userId) {
                    const user = await prisma.users.findUnique({
                        where: { id: uid },
                        select: { id: true, first_name: true, last_name: true }
                    });
                    if (user) typing.push(user);
                }
            }
        }
        
        res.json({ typing });
    } catch (error) {
        console.error('Get typing status error:', error);
        res.status(500).json({ error: 'Failed to fetch typing status' });
    }
});

// ==================== GET GROUP MEMBERS ====================
router.get('/:id/members', async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const members = await prisma.user_groups.findMany({
            where: { group_id: groupId },
            include: {
                users: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        profile_picture: true,
                        university: true,
                        field_of_study: true
                    }
                }
            },
            orderBy: { joined_at: 'asc' }
        });
        res.json(members);
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// ==================== ADMIN: GET JOIN REQUESTS ====================
router.get('/:id/requests', authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);

        // Verify user is admin (owner) of this group
        const membership = await prisma.user_groups.findUnique({
            where: { user_id_group_id: { user_id: req.userId, group_id: groupId } }
        });

        if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
            return res.status(403).json({ error: 'Only group admins can view join requests' });
        }

        // Get all pending requests with user details
        const requests = await prisma.group_join_requests.findMany({
            where: { group_id: groupId, status: 'pending' },
            include: {
                users: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        university: true,
                        field_of_study: true,
                        profile_picture: true,
                        bio: true
                    }
                }
            },
            orderBy: { requested_at: 'desc' }
        });

        res.json(requests);
    } catch (error) {
        console.error('Get join requests error:', error);
        res.status(500).json({ error: 'Failed to fetch join requests' });
    }
});

// ==================== ADMIN: APPROVE JOIN REQUEST ====================
router.post('/:id/requests/:requestId/approve', authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const requestId = parseInt(req.params.requestId);

        // Verify user is admin
        const membership = await prisma.user_groups.findUnique({
            where: { user_id_group_id: { user_id: req.userId, group_id: groupId } }
        });

        if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
            return res.status(403).json({ error: 'Only group admins can approve requests' });
        }

        // Get the join request
        const request = await prisma.group_join_requests.findUnique({
            where: { id: requestId },
            include: { groups: true, users: { select: { first_name: true, last_name: true } } }
        });

        if (!request) return res.status(404).json({ error: 'Join request not found' });
        if (request.group_id !== groupId) return res.status(403).json({ error: 'Request does not belong to this group' });
        if (request.status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });

        // Check if group is full
        if (request.groups.current_members >= request.groups.max_members) {
            return res.status(400).json({ error: 'Group is full' });
        }

        // Approve: update request, create membership, increment member count, notify requester
        await prisma.$transaction([
            prisma.group_join_requests.update({
                where: { id: requestId },
                data: { status: 'approved', processed_at: new Date(), processed_by: req.userId }
            }),
            prisma.user_groups.create({
                data: { user_id: request.user_id, group_id: groupId, role: 'member' }
            }),
            prisma.groups.update({
                where: { id: groupId },
                data: { current_members: { increment: 1 } }
            }),
            prisma.notifications.create({
                data: {
                    user_id: request.user_id,
                    type: 'request_approved',
                    message: `Your request to join ${request.groups.name} was approved`,
                    related_group_id: groupId,
                    related_user_id: req.userId
                }
            })
        ]);

        res.json({ success: true, message: `${request.users.first_name} ${request.users.last_name} added to group` });
    } catch (error) {
        console.error('Approve request error:', error);
        res.status(500).json({ error: 'Failed to approve request' });
    }
});

// ==================== ADMIN: DENY JOIN REQUEST ====================
router.post('/:id/requests/:requestId/deny', authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const requestId = parseInt(req.params.requestId);

        // Verify user is admin
        const membership = await prisma.user_groups.findUnique({
            where: { user_id_group_id: { user_id: req.userId, group_id: groupId } }
        });

        if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
            return res.status(403).json({ error: 'Only group admins can deny requests' });
        }

        // Get the join request
        const request = await prisma.group_join_requests.findUnique({
            where: { id: requestId },
            include: { groups: true, users: { select: { first_name: true, last_name: true } } }
        });

        if (!request) return res.status(404).json({ error: 'Join request not found' });
        if (request.group_id !== groupId) return res.status(403).json({ error: 'Request does not belong to this group' });
        if (request.status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });

        // Deny: update request and notify requester
        await prisma.$transaction([
            prisma.group_join_requests.update({
                where: { id: requestId },
                data: { status: 'denied', processed_at: new Date(), processed_by: req.userId }
            }),
            prisma.notifications.create({
                data: {
                    user_id: request.user_id,
                    type: 'request_denied',
                    message: `Your request to join ${request.groups.name} was declined`,
                    related_group_id: groupId,
                    related_user_id: req.userId
                }
            })
        ]);

        res.json({ success: true, message: `Request from ${request.users.first_name} ${request.users.last_name} denied` });
    } catch (error) {
        console.error('Deny request error:', error);
        res.status(500).json({ error: 'Failed to deny request' });
    }
});

// ==================== ADMIN: REMOVE MEMBER ====================
router.delete('/:id/members/:userId', authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const targetUserId = parseInt(req.params.userId);

        // Verify requester is admin
        const adminMembership = await prisma.user_groups.findUnique({
            where: { user_id_group_id: { user_id: req.userId, group_id: groupId } }
        });

        if (!adminMembership || (adminMembership.role !== 'owner' && adminMembership.role !== 'admin')) {
            return res.status(403).json({ error: 'Only group admins can remove members' });
        }

        // Cannot remove yourself this way (use leave endpoint)
        if (targetUserId === req.userId) {
            return res.status(400).json({ error: 'Use the leave endpoint to exit a group' });
        }

        // Get target membership
        const targetMembership = await prisma.user_groups.findUnique({
            where: { user_id_group_id: { user_id: targetUserId, group_id: groupId } },
            include: { users: { select: { first_name: true, last_name: true } } }
        });

        if (!targetMembership) {
            return res.status(404).json({ error: 'User is not a member of this group' });
        }

        // Cannot remove another admin/owner (safety measure)
        if (targetMembership.role === 'owner' || targetMembership.role === 'admin') {
            return res.status(403).json({ error: 'Cannot remove another admin' });
        }

        // Remove member
        await prisma.user_groups.delete({
            where: { user_id_group_id: { user_id: targetUserId, group_id: groupId } }
        });
        await prisma.groups.update({
            where: { id: groupId },
            data: { current_members: { decrement: 1 } }
        });

        res.json({ success: true, message: `${targetMembership.users.first_name} ${targetMembership.users.last_name} removed from group` });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

// ==================== ADMIN: GET GROUP ACTIVITY ====================
router.get('/:id/activity', authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const { days = 7 } = req.query;

        // Verify user is admin
        const membership = await prisma.user_groups.findUnique({
            where: { user_id_group_id: { user_id: req.userId, group_id: groupId } }
        });

        if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
            return res.status(403).json({ error: 'Only group admins can view activity' });
        }

        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));

        // Aggregate message counts by day
        const messages = await prisma.group_messages.findMany({
            where: {
                group_id: groupId,
                created_at: { gte: daysAgo }
            },
            select: { created_at: true }
        });

        // Group by date
        const activityMap = {};
        messages.forEach(msg => {
            const date = new Date(msg.created_at).toISOString().split('T')[0];
            activityMap[date] = (activityMap[date] || 0) + 1;
        });

        // Convert to array format for charting
        const activity = Object.entries(activityMap).map(([date, count]) => ({ date, count }));

        res.json({ activity, totalMessages: messages.length });
    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

module.exports = router;
