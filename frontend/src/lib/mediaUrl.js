const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

/**
 * Resolve a stored file reference to something an <img>/<audio>/<a> can load.
 *
 * Uploads are stored in one of two shapes depending on how the server was
 * configured when the file arrived:
 *
 *   - a Cloudinary URL — `https://res.cloudinary.com/...` (production)
 *   - a server-relative path — `/uploads/1699...jpg` (local disk fallback)
 *
 * Only the second needs the API origin prepended. Prefixing an absolute URL
 * produces `https://api.example.comhttps://res.cloudinary.com/...`, which fails
 * silently — the image simply never appears, with no error anyone would notice.
 * Both shapes coexist in the database, so this has to handle either.
 */
export function mediaUrl(path) {
    if (!path) return null;
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

export { API_ORIGIN };
export default mediaUrl;
