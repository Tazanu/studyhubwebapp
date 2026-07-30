const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const upload = require('../middleware/upload');
const authenticate = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set');
    process.exit(1);
}

// ===================== REGISTER =====================
const multerSingle = upload.single('proofDocument');
router.post('/register', (req, res, next) => {
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        multerSingle(req, res, next);
    } else {
        next();
    }
}, async (req, res) => {
    try {
        const { email, password, firstName, lastName, university, fieldOfStudy, becomeTutor, tutorApplication } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const existingUser = await prisma.users.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const isTutorApp = becomeTutor === 'true' || becomeTutor === true;
        let tutorData = null;

        if (isTutorApp) {
            const ta = typeof tutorApplication === 'string' ? JSON.parse(tutorApplication) : (tutorApplication || {});
            if (!ta.subjects || !Array.isArray(ta.subjects) || ta.subjects.length === 0) {
                return res.status(400).json({ error: 'At least one subject is required' });
            }
            if (!ta.bio || ta.bio.trim().length < 20) {
                return res.status(400).json({ error: 'Bio must be at least 20 characters' });
            }
            tutorData = ta;
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const user = await prisma.users.create({
            data: {
                email,
                password: hashedPassword,
                first_name: firstName,
                last_name: lastName,
                university,
                field_of_study: fieldOfStudy,
                reputation: 100
            },
            select: {
                id: true, email: true, first_name: true, last_name: true,
                university: true, field_of_study: true, role: true, reputation: true
            }
        });

        let tutorStatus = null;
        if (isTutorApp && tutorData) {
            const proofUrl = req.file ? req.file.path : null;
            await prisma.tutors.create({
                data: {
                    user_id: user.id,
                    bio: tutorData.bio,
                    subjects: tutorData.subjects,
                    hourly_rate: tutorData.hourlyRate || 500,
                    years_experience: tutorData.yearsExperience || '<1',
                    availability: tutorData.availability || null,
                    proof_document_url: proofUrl,
                    status: 'pending',
                    applied_at: new Date()
                }
            });
            tutorStatus = 'pending';
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(201).json({
            success: true,
            token,
            user: { ...user, tutor_status: tutorStatus },
            becomeTutor: isTutorApp
        });
    } catch (error) {
        console.error('Registration error:', error.message);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// ===================== LOGIN =====================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await prisma.users.findUnique({ where: { email } });

        // Always run bcrypt compare to prevent timing attacks
        const dummyHash = '$2a$12$invalidhashfortimingprotectiononly000000000000000000000';
        const isValidPassword = user
            ? await bcrypt.compare(password, user.password)
            : await bcrypt.compare(password, dummyHash).then(() => false);

        if (!user || !isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is disabled' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                university: user.university,
                field_of_study: user.field_of_study,
                role: user.role,
                reputation: user.reputation,
                profile_picture: user.profile_picture
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ===================== GET CURRENT USER =====================
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await prisma.users.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true, email: true, first_name: true, last_name: true,
                university: true, field_of_study: true, role: true,
                reputation: true, profile_picture: true, bio: true,
                is_active: true, created_at: true,
                tutors: { select: { status: true } }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { tutors, ...rest } = user;
        res.json({ user: { ...rest, tutor_status: tutors?.status ?? null } });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// ===================== CHANGE PASSWORD =====================
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword)
            return res.status(400).json({ error: 'Both fields are required' });
        if (newPassword.length < 8)
            return res.status(400).json({ error: 'New password must be at least 8 characters' });

        const user = await prisma.users.findUnique({ where: { id: req.userId } });
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

        const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await prisma.users.update({ where: { id: req.userId }, data: { password: hashed } });
        res.json({ success: true });
    } catch (error) {
        console.error('Change password error:', error.message);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router;
