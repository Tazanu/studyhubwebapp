const rateLimit = require('express-rate-limit');

const int = (envVar, fallback) => parseInt(process.env[envVar] || fallback, 10);

// General API limiter — all routes
const apiLimiter = rateLimit({
    windowMs: int('RATE_WINDOW_MS', 15 * 60 * 1000), // 15 min
    max: int('RATE_API_MAX', 500),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
    windowMs: int('RATE_AUTH_WINDOW_MS', 15 * 60 * 1000), // 15 min
    max: int('RATE_AUTH_MAX', 20),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts, please try again later.' },
    skipSuccessfulRequests: true,
});

// Very strict limiter for login specifically (brute-force protection)
const loginLimiter = rateLimit({
    windowMs: int('RATE_LOGIN_WINDOW_MS', 15 * 60 * 1000), // 15 min
    max: int('RATE_LOGIN_MAX', 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please wait 15 minutes before trying again.' },
    skipSuccessfulRequests: true,
});

// Payment endpoints — prevent abuse but allow reasonable testing
const paymentLimiter = rateLimit({
    windowMs: int('RATE_PAYMENT_WINDOW_MS', 60 * 60 * 1000), // 1 hour
    max: int('RATE_PAYMENT_MAX', 20),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many payment requests. Please try again later.' },
});

// Payment status polling — the client polls every few seconds for up to five
// minutes per payment, so this must be far looser than paymentLimiter. Applying
// the strict limiter here would let a single payment exhaust the whole quota.
const paymentPollLimiter = rateLimit({
    windowMs: int('RATE_PAYMENT_POLL_WINDOW_MS', 60 * 60 * 1000), // 1 hour
    max: int('RATE_PAYMENT_POLL_MAX', 600),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many status checks. Please try again later.' },
});

module.exports = { apiLimiter, authLimiter, loginLimiter, paymentLimiter, paymentPollLimiter };
