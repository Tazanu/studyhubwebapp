/**
 * Controlled access to note files.
 *
 * Premium content must never be reachable by URL alone. Two storage backends
 * are in play:
 *
 *   - Local files (legacy, pre-Cloudinary) live under `uploads/`. Premium ones
 *     are moved into `uploads/protected/`, which the static mount refuses to
 *     serve, so the only way in is a route that checks entitlement.
 *   - Cloudinary files are converted from `upload` to `authenticated` delivery,
 *     which makes the plain public URL stop working even for someone who
 *     already copied it.
 *
 * Either way the bytes are streamed through us, so the client never receives a
 * durable link to premium content.
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
const PROTECTED_DIRNAME = 'protected';
const PROTECTED_ROOT = path.join(UPLOADS_ROOT, PROTECTED_DIRNAME);
const PROTECTED_PREFIX = `/uploads/${PROTECTED_DIRNAME}/`;

const isRemote = p => typeof p === 'string' && /^https?:\/\//i.test(p);
const isProtectedLocal = p => typeof p === 'string' && p.startsWith(PROTECTED_PREFIX);

/**
 * Resolve a local /uploads path to a real file, refusing anything that escapes
 * the uploads directory.
 */
function resolveLocal(filePath) {
    const relative = String(filePath).replace(/^\/uploads\//, '');
    const resolved = path.resolve(UPLOADS_ROOT, relative);
    if (resolved !== UPLOADS_ROOT && !resolved.startsWith(UPLOADS_ROOT + path.sep)) {
        return null; // path traversal attempt
    }
    return resolved;
}

// -- Cloudinary helpers -------------------------------------------------------

/**
 * Pull the public id and resource type out of a Cloudinary delivery URL.
 * @returns {{ publicId: string, resourceType: string, type: string,
 *             format?: string, version?: string } | null}
 */
function parseCloudinaryUrl(url) {
    // Authenticated/private delivery URLs carry an extra `s--<signature>--/`
    // segment before the version — e.g. `.../authenticated/s--AbC123--/v1/...` —
    // which must be skipped along with the version, or it leaks into publicId.
    const m = String(url).match(
        /res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/(upload|authenticated)\/(?:s--[\w-]+--\/)?(?:v(\d+)\/)?(.+)$/i
    );
    if (!m) return null;
    const [, resourceType, type, version, rest] = m;
    // Drop the extension for image/video (kept in `format` instead); raw
    // assets keep theirs as part of the public_id itself.
    let publicId = rest;
    let format;
    if (resourceType !== 'raw') {
        const extMatch = rest.match(/\.([^./]+)$/);
        if (extMatch) {
            format = extMatch[1];
            publicId = rest.slice(0, -(format.length + 1));
        }
    }
    return { publicId, resourceType, type, format, version };
}

/** True once the asset is delivered as `authenticated` rather than public. */
function isProtectedRemote(url) {
    const parsed = parseCloudinaryUrl(url);
    return !!parsed && parsed.type === 'authenticated';
}

/**
 * Convert a public Cloudinary asset to authenticated delivery so its plain URL
 * stops resolving. Returns the new URL, or the original if it cannot be moved.
 */
async function protectRemoteAsset(url) {
    const parsed = parseCloudinaryUrl(url);
    if (!parsed) return url;                 // not a Cloudinary URL, leave alone
    if (parsed.type === 'authenticated') return url; // already protected

    const renamed = await cloudinary.uploader.rename(parsed.publicId, parsed.publicId, {
        resource_type: parsed.resourceType,
        type: 'upload',
        to_type: 'authenticated',
        overwrite: true,
    });
    return renamed.secure_url || url;
}

/**
 * Signed, server-side-only download URL via Cloudinary's `/download` admin
 * endpoint. Always works, but it is an API endpoint rather than the CDN, so
 * it is slow (measured well under 100 KB/s) — use it only as a fallback.
 */
function signedUrlFor(url) {
    const parsed = parseCloudinaryUrl(url);
    if (!parsed) return url;
    return cloudinary.utils.private_download_url(parsed.publicId, parsed.format, {
        resource_type: parsed.resourceType,
        type: parsed.type,
    });
}

/**
 * Plain CDN delivery URL for a publicly-deliverable Cloudinary asset, or null
 * when the asset is not one (authenticated assets, or non-Cloudinary paths).
 *
 * Cloudinary serves these with CORS enabled, `Accept-Ranges: bytes` and a long
 * immutable cache, so handing this straight to the browser is far better than
 * proxying: one hop instead of two, range requests let a PDF viewer render the
 * first page before the whole file lands, and repeat views come from cache.
 *
 * `attachmentName` adds Cloudinary's `fl_attachment`, which makes it send
 * `Content-Disposition: attachment`. Redirecting hands the response over to
 * Cloudinary, so this is the only way to force a download after a redirect.
 */
function publicUrlFor(url, { attachmentName } = {}) {
    const parsed = parseCloudinaryUrl(url);
    if (!parsed || parsed.type === 'authenticated') return null;
    return cloudinary.url(parsed.publicId, {
        resource_type: parsed.resourceType,
        type: parsed.type,
        format: parsed.format,
        // Keep the original version. Cloudinary serves these `immutable` for 30
        // days, so a URL pinned to the generic `v1` would keep hitting browser
        // caches even after the asset behind the public id is replaced.
        version: parsed.version,
        secure: true,
        ...(attachmentName
            ? { flags: `attachment:${attachmentName.replace(/[^\w.\- ]+/g, '_')}` }
            : {}),
    });
}

/**
 * URLs to try, fastest first, when fetching a Cloudinary asset server-side.
 *
 * Plain CDN delivery is dramatically faster, but two things can reject it:
 *
 *   - `type: authenticated` assets are not reachable by delivery URL at all.
 *   - PDFs (and ZIPs) are rejected while the account's "PDF and ZIP files
 *     delivery" security option is off, which is Cloudinary's default.
 *
 * Rather than hard-wiring either assumption, try the CDN and fall back to the
 * signed download endpoint. That keeps PDFs working on a default-configured
 * account and silently gets faster once the option is enabled.
 */
function remoteCandidatesFor(url) {
    const parsed = parseCloudinaryUrl(url);
    if (!parsed) return [url];

    const signed = signedUrlFor(url);
    const cdn = publicUrlFor(url);
    return cdn ? [cdn, signed] : [signed];
}

// -- moving existing files into protection ------------------------------------

/**
 * Make a stored file non-public. Local files move into `uploads/protected/`;
 * Cloudinary assets switch to authenticated delivery.
 * @returns {Promise<string>} the new file_path to persist
 */
async function protectFile(filePath) {
    if (!filePath) return filePath;

    if (isRemote(filePath)) return protectRemoteAsset(filePath);
    if (isProtectedLocal(filePath)) return filePath;

    const source = resolveLocal(filePath);
    if (!source || !fs.existsSync(source)) return filePath; // nothing to move

    fs.mkdirSync(PROTECTED_ROOT, { recursive: true });
    const basename = path.basename(source);
    const target = path.join(PROTECTED_ROOT, basename);
    fs.renameSync(source, target);
    return PROTECTED_PREFIX + basename;
}

// -- serving ------------------------------------------------------------------

const CONTENT_TYPES = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    txt: 'text/plain; charset=utf-8',
    md: 'text/markdown; charset=utf-8',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const contentTypeFor = ext => CONTENT_TYPES[String(ext || '').toLowerCase()] || 'application/octet-stream';

/**
 * Stream a note's bytes to the client. Callers MUST check entitlement first.
 * The client only ever sees our URL, never the underlying storage location.
 *
 * `cacheControl` defaults to no-store because the caller is usually serving
 * gated content; free content should pass a cacheable value explicitly.
 */
async function streamFile(
    res,
    filePath,
    { filename, fileType, download = false, cacheControl = 'private, no-store' } = {}
) {
    const ext = String(fileType || path.extname(String(filePath)).replace('.', '')).toLowerCase();
    const safeName = String(filename || 'file').replace(/[^\w.\- ]+/g, '_');

    res.setHeader('Content-Type', contentTypeFor(ext));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader(
        'Content-Disposition',
        `${download ? 'attachment' : 'inline'}; filename="${safeName}${ext ? '.' + ext : ''}"`
    );

    if (isRemote(filePath)) {
        const candidates = remoteCandidatesFor(filePath);
        let upstream, lastErr;
        for (const candidate of candidates) {
            try {
                upstream = await axios.get(candidate, {
                    responseType: 'stream',
                    headers: { 'User-Agent': 'StudyHub/1.0' },
                    validateStatus: s => s < 400,
                });
                break;
            } catch (err) {
                lastErr = err;
            }
        }
        if (!upstream) throw lastErr;

        // Forward the real length so the client can detect a short read; without
        // it a mid-transfer failure looks like a complete (but corrupt) file.
        const len = upstream.headers['content-length'];
        if (len) res.setHeader('Content-Length', len);
        return pipeOrFail(upstream.data, res, filePath);
    }

    const resolved = resolveLocal(filePath);
    if (!resolved || !fs.existsSync(resolved)) {
        res.removeHeader('Content-Disposition');
        return res.status(410).json({ error: 'File no longer available. Please re-upload.' });
    }
    return pipeOrFail(fs.createReadStream(resolved), res, filePath);
}

/**
 * Pipe a source stream to the response, failing loudly instead of silently
 * truncating. Once bytes are on the wire we cannot change the status code, so
 * the connection is destroyed — a broken transfer beats a corrupt file that
 * still reports 200.
 */
function pipeOrFail(source, res, filePath) {
    source.on('error', err => {
        console.error('streamFile: upstream read failed for', filePath, '-', err.message);
        if (res.headersSent) res.destroy(err);
        else res.status(502).json({ error: 'Could not read the file from storage.' });
    });
    res.on('close', () => source.destroy());
    return source.pipe(res);
}

module.exports = {
    UPLOADS_ROOT,
    PROTECTED_ROOT,
    PROTECTED_DIRNAME,
    PROTECTED_PREFIX,
    isRemote,
    isProtectedLocal,
    isProtectedRemote,
    parseCloudinaryUrl,
    protectFile,
    protectRemoteAsset,
    publicUrlFor,
    signedUrlFor,
    streamFile,
};
