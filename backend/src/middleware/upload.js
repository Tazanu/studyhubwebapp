const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const cloudinaryConfigured = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');

let storage;

if (cloudinaryConfigured) {
    cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });

    storage = new CloudinaryStorage({
        cloudinary,
        params: (req, file) => {
            const isPdf = file.mimetype === 'application/pdf';
            const isImage = file.mimetype.startsWith('image/');
            const isAudio = file.mimetype.startsWith('audio/');
            return {
                folder: 'studyhub',
                resource_type: isImage ? 'image' : isAudio ? 'video' : isPdf ? 'image' : 'raw',
                format: isPdf ? 'pdf' : undefined,
                public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
            };
        },
    });
} else {
    // Without credentials every Cloudinary upload fails with "Must supply
    // api_key", which surfaces as an opaque 500. Fall back to local disk — the
    // storage this app used before Cloudinary — so uploads keep working, and say
    // so loudly, because local files do not survive an ephemeral host.
    console.warn(
        '[upload] CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are not set — ' +
        'storing uploads on local disk at uploads/. Set them in .env to use Cloudinary.'
    );

    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
            cb(null, UPLOADS_ROOT);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname) || '';
            cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        },
    });
}

const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
]);

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        ALLOWED_MIME_TYPES.has(file.mimetype) ? cb(null, true) : cb(new Error('File type not allowed'), false);
    },
});

/**
 * The path to persist for an uploaded file, whichever backend handled it.
 * Cloudinary gives back a URL in `path`; disk storage gives an absolute local
 * path, which must never be stored as-is.
 */
function storedPathFor(file) {
    if (!file) return null;
    if (cloudinaryConfigured) return file.path || file.secure_url;
    return `/uploads/${file.filename}`;
}

module.exports = upload;
module.exports.upload = upload;
module.exports.storedPathFor = storedPathFor;
module.exports.cloudinaryConfigured = cloudinaryConfigured;
