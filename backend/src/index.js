const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const path = require('path');
const { initializeSocket } = require('./socket');
const { apiLimiter, authLimiter, loginLimiter, paymentLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const noteRoutes = require('./routes/notes');
const qaRoutes = require('./routes/qa');
const tutorRoutes = require('./routes/tutors');
const paymentRoutes = require('./routes/payments');
const statsRoutes = require('./routes/stats');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const premiumRoutes = require('./routes/premium');

const app = express();
const PORT = process.env.PORT || 5000;

// Required for express-rate-limit and secure cookies behind Render's reverse proxy
app.set('trust proxy', 1);

const server = http.createServer(app);
const io = initializeSocket(server);
app.set('io', io);

// ── Phase 8: Security headers ──────────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
        },
    },
}));

// ── Phase 6: CORS — no wildcard with credentials ───────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

// ── Uploads: served with no-sniff, no-cache for user content ──────────────
app.use('/uploads', (req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'private, no-cache');
    next();
}, express.static(path.join(__dirname, '..', 'uploads')));

// ── Phase 2: Rate limiting ─────────────────────────────────────────────────
app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/change-password', authLimiter);
app.use('/api/payments', paymentLimiter);
app.use('/api/premium/pay', paymentLimiter);

// ── Health (no rate limit needed) ─────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/tutors', tutorRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/premium', premiumRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'StudyHub API', version: '2.0.0' });
});

// ── Phase 9: Global error handler — no stack traces to client ─────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    // Log full error server-side
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} —`, err.message);

    // CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS policy violation' });
    }
    // Multer file type rejection
    if (err.message === 'File type not allowed') {
        return res.status(400).json({ error: 'File type not allowed' });
    }
    // Generic — never expose internals
    res.status(err.status || 500).json({ error: 'An unexpected error occurred' });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
