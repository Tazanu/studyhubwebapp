const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('./prisma');

// In-memory store for typing status (groupId -> Map(userId -> lastTypingTime))
// NOTE: This will be removed once polling endpoints are deprecated in Phase 3
const typingStatus = new Map();

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - The HTTP server instance from Express
 * @returns {SocketIO.Server} Configured Socket.IO instance
 */
function initializeSocket(httpServer) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
        .split(',')
        .map(o => o.trim());

    const io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) callback(null, true);
                else callback(new Error('Not allowed by CORS'));
            },
            credentials: true,
            methods: ['GET', 'POST']
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // ==================== AUTHENTICATION MIDDLEWARE ====================
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            
            if (!token) {
                return next(new Error('Authentication token required'));
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            // Attach user info to socket for easy access
            socket.userId = decoded.userId;
            socket.userEmail = decoded.email;

            // Verify user still exists in DB
            const user = await prisma.users.findUnique({
                where: { id: decoded.userId },
                select: { id: true, first_name: true, last_name: true, is_active: true }
            });

            if (!user || !user.is_active) {
                return next(new Error('User not found or inactive'));
            }

            socket.user = user;
            next();
        } catch (err) {
            console.error('Socket auth error:', err.message);
            next(new Error('Invalid authentication token'));
        }
    });

    // ==================== CONNECTION HANDLER ====================
    io.on('connection', (socket) => {
        console.log(`✅ Socket connected: ${socket.user.first_name} ${socket.user.last_name} (${socket.id})`);

        // ── JOIN GROUP ──────────────────────────────────────────
        socket.on('group:join', async (groupId) => {
            try {
                // Verify membership before allowing join
                const membership = await prisma.user_groups.findUnique({
                    where: {
                        user_id_group_id: {
                            user_id: socket.userId,
                            group_id: parseInt(groupId)
                        }
                    }
                });

                if (!membership) {
                    socket.emit('error', { message: 'Not a member of this group' });
                    return;
                }

                const roomName = `group:${groupId}`;
                socket.join(roomName);
                console.log(`📥 ${socket.user.first_name} joined room ${roomName}`);

                // Notify others in the room (excluding the joiner)
                socket.to(roomName).emit('user:joined', {
                    userId: socket.userId,
                    firstName: socket.user.first_name,
                    lastName: socket.user.last_name
                });

                // Confirm join to the user
                socket.emit('group:joined', { groupId });
            } catch (err) {
                console.error('Error joining group:', err);
                socket.emit('error', { message: 'Failed to join group' });
            }
        });

        // ── LEAVE GROUP ─────────────────────────────────────────
        socket.on('group:leave', (groupId) => {
            const roomName = `group:${groupId}`;
            socket.leave(roomName);
            console.log(`📤 ${socket.user.first_name} left room ${roomName}`);

            // Notify others
            socket.to(roomName).emit('user:left', {
                userId: socket.userId,
                firstName: socket.user.first_name,
                lastName: socket.user.last_name
            });
        });

        // ── TYPING INDICATORS ───────────────────────────────────
        socket.on('typing:start', (groupId) => {
            const roomName = `group:${groupId}`;
            
            // Update in-memory store
            if (!typingStatus.has(groupId)) {
                typingStatus.set(groupId, new Map());
            }
            typingStatus.get(groupId).set(socket.userId, Date.now());

            // Broadcast to others in the room (exclude sender)
            socket.to(roomName).emit('typing:update', {
                userId: socket.userId,
                firstName: socket.user.first_name,
                lastName: socket.user.last_name,
                isTyping: true
            });
        });

        socket.on('typing:stop', (groupId) => {
            const roomName = `group:${groupId}`;
            
            // Remove from in-memory store
            if (typingStatus.has(groupId)) {
                typingStatus.get(groupId).delete(socket.userId);
            }

            // Broadcast to others
            socket.to(roomName).emit('typing:update', {
                userId: socket.userId,
                isTyping: false
            });
        });

        // ── DISCONNECT ──────────────────────────────────────────
        socket.on('disconnect', (reason) => {
            console.log(`❌ Socket disconnected: ${socket.user.first_name} (${reason})`);
            
            // Clean up typing status across all groups
            for (const [groupId, userMap] of typingStatus) {
                if (userMap.has(socket.userId)) {
                    userMap.delete(socket.userId);
                    io.to(`group:${groupId}`).emit('typing:update', {
                        userId: socket.userId,
                        isTyping: false
                    });
                }
            }
        });

        // ── ERROR HANDLING ──────────────────────────────────────
        socket.on('error', (error) => {
            console.error(`Socket error for user ${socket.userId}:`, error);
        });
    });

    // Periodic cleanup of stale typing indicators (every 10 seconds)
    setInterval(() => {
        const now = Date.now();
        const TYPING_TIMEOUT = 5000; // 5 seconds

        for (const [groupId, userMap] of typingStatus) {
            for (const [userId, lastTyping] of userMap) {
                if (now - lastTyping > TYPING_TIMEOUT) {
                    userMap.delete(userId);
                    io.to(`group:${groupId}`).emit('typing:update', {
                        userId,
                        isTyping: false
                    });
                }
            }
        }
    }, 10000);

    return io;
}

/**
 * Emit a new message to all clients in a group room
 * Called from REST endpoint after successfully creating a message
 */
function emitNewMessage(io, groupId, message) {
    io.to(`group:${groupId}`).emit('message:new', message);
}

/**
 * Emit a message edit to all clients in a group room
 * Called from REST endpoint after successfully editing a message
 */
function emitMessageEdit(io, groupId, message) {
    io.to(`group:${groupId}`).emit('message:edit', message);
}

module.exports = {
    initializeSocket,
    emitNewMessage,
    emitMessageEdit
};
