const jwt = require('jsonwebtoken');

/**
 * Populates req.userId when a valid token is present, but never rejects.
 * For endpoints that are public yet render differently for a signed-in user
 * (e.g. showing whether they already own a premium note).
 */
function optionalAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
            req.userId = decoded.userId;
            req.userEmail = decoded.email;
        } catch {
            // invalid/expired token — treat as anonymous
        }
    }
    next();
}

module.exports = optionalAuth;
