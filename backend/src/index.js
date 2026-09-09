const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const path = require('path');
const { initializeSocket } = require('./socket');
const { apiLimiter, authLimiter, loginLimiter, paymentLimiter, paymentPollLimiter } = require('./middleware/rateLimiter');

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

// ── Force HTTPS in production ──────────────────────────────────────────────
// Hosts like Render terminate TLS at the proxy and forward plain HTTP, so
// `req.secure` is false even on an https:// request — `x-forwarded-proto` is
// the real signal, and it is trustworthy only because `trust proxy` is set
// above. Redirect rather than reject so a typed http:// URL still works, and
// use 308 to preserve the method and body of a non-GET request.
//
// This is the redirect; helmet's HSTS header (set below) is what stops the
// browser making the insecure request a second time.
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.secure || req.get('x-forwarded-proto') === 'https') return next();
        res.redirect(308, `https://${req.get('host')}${req.originalUrl}`);
    });
}

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
            connectSrc: ["'self'", 'https:'],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
        },
    },
}));

// ── Phase 6: CORS — no wildcard with credentials ───────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

// Shout about a deployed server still carrying the localhost default. Left
// unnoticed it rejects every browser request with an opaque 403, which reads
// like a frontend bug and is miserable to trace back to a missing env var.
if (process.env.NODE_ENV === 'production' && allowedOrigins.every(o => /localhost|127\.0\.0\.1/.test(o))) {
    console.error(
        '\n*** CORS MISCONFIGURED ***\n' +
        `  ALLOWED_ORIGINS is ${JSON.stringify(allowedOrigins)} on a production server.\n` +
        '  Every browser request will be rejected with 403.\n' +
        '  Set ALLOWED_ORIGINS to the deployed frontend origin, e.g.\n' +
        '    ALLOWED_ORIGINS=https://your-app.vercel.app\n' +
        '  (scheme included, no trailing slash, comma-separated for several)\n'
    );
} else {
    console.log('[cors] allowed origins:', allowedOrigins.join(', '));
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Name the rejected origin. Without it the logs say only that
            // something was blocked, and a trailing slash or http-vs-https
            // mismatch is invisible.
            console.warn(
                `[cors] rejected origin ${JSON.stringify(origin)} — not in ${JSON.stringify(allowedOrigins)}`
            );
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

// ── Uploads: served with no-sniff, no-cache for user content ──────────────
// `uploads/protected/` holds paid content and is NOT public: it is reachable
// only through routes that check entitlement first. Everything else here
// (avatars, chat attachments, free notes) stays directly servable.
const { PROTECTED_DIRNAME } = require('./services/fileAccess');

app.use('/uploads', (req, res, next) => {
    const first = req.path.split('/').filter(Boolean)[0];
    if (first && first.toLowerCase() === PROTECTED_DIRNAME) {
        return res.status(403).json({ error: 'This file requires purchase. Use the note download endpoint.' });
    }
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'private, no-cache');
    next();
}, express.static(path.join(__dirname, '..', 'uploads'), { dotfiles: 'deny', index: false }));

// ── Phase 2: Rate limiting ─────────────────────────────────────────────────
app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/change-password', authLimiter);
// Status polling is high-frequency by design, so it gets its own loose limiter.
// It must be registered before the strict limiter below, which covers the
// money-moving endpoints.
app.use('/api/payments/status', paymentPollLimiter);
app.use('/api/premium/pay/status', paymentPollLimiter);
app.use('/api/payments/initiate', paymentLimiter);
app.use('/api/premium/pay/initiate', paymentLimiter);

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

// ── 404 for unmatched API routes ───────────────────────────────────────────
// Without this an unknown /api/* path falls through to the error handler and
// surfaces as a confusing 500. Scoped to /api so it cannot shadow anything
// else mounted on this server.
app.use('/api', (req, res) => {
    res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// ── Phase 9: Global error handler — no stack traces to client ─────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    // Log full error server-side. Not everything thrown is an Error — upload
    // and SDK failures often reject with a plain object, whose `.message` is
    // undefined — so fall back to dumping the whole value.
    console.error(
        `[${new Date().toISOString()}] ${req.method} ${req.path} —`,
        err?.stack || err?.message || err
    );
    if (err && !err.stack && typeof err === 'object') {
        console.error('  error detail:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    }

    // CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS policy violation' });
    }
    // Multer file type rejection
    if (err.message === 'File type not allowed') {
        return res.status(400).json({ error: 'File type not allowed' });
    }
    // Upload backend misconfigured — say so instead of a blank 500.
    if (/Must supply api_key|api_secret|cloud_name/i.test(err?.message || '')) {
        return res.status(500).json({
            error: 'File storage is not configured on the server. Set the CLOUDINARY_* variables in backend/.env.',
        });
    }
    // Generic — never expose internals
    res.status(err.status || 500).json({ error: 'An unexpected error occurred' });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Surface bad payment credentials at boot rather than at the moment a
    // student tries to pay. Read-only; moves no money.
    require('./services/paymentHealth').checkPaymentCredentials().catch(() => {});
    // Settles payments the browser stopped watching (tab closed, signal lost,
    // PIN entered late) so a successful charge always grants access.
    require('./services/reconciler').start();
});
