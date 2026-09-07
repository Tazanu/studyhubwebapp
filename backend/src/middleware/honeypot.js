/**
 * Honeypot spam filter for public, unauthenticated forms.
 *
 * The form renders a field that is invisible and unreachable by keyboard or
 * screen reader, so a real person never fills it. Most form-spam bots parse the
 * HTML and populate every input they find, which is what gives them away.
 *
 * Deliberately paired with, not a replacement for, the rate limiters in
 * rateLimiter.js: this catches naive bots cheaply, rate limiting catches the
 * ones that are careful enough to skip it.
 */
const HONEYPOT_FIELD = 'website';

function honeypot(req, res, next) {
    const value = req.body?.[HONEYPOT_FIELD];

    if (typeof value === 'string' && value.trim() !== '') {
        console.warn(
            `[honeypot] blocked ${req.method} ${req.originalUrl} from ${req.ip} — field filled`
        );
        // Answer exactly as a genuine validation failure would. Naming the trap
        // just tells whoever is probing which field to leave alone next time.
        return res.status(400).json({ error: 'Registration could not be completed' });
    }

    // Never let it reach the model layer as a stray column.
    if (req.body) delete req.body[HONEYPOT_FIELD];
    next();
}

module.exports = honeypot;
module.exports.HONEYPOT_FIELD = HONEYPOT_FIELD;
