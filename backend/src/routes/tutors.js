const express = require('express');
const prisma = require('../prisma');
const authenticate = require('../middleware/auth');
const { consumeCredit, creditBalance, availableCreditPacks, refundCredit } = require('../services/entitlements');

const router = express.Router();

// ===================== GET ALL TUTORS =====================
router.get('/', async (req, res) => {
    try {
        const { subject, all } = req.query;

        // Pass ?all=1 to include non-approved (used internally for ownership checks)
        const where = all ? {} : { status: 'approved', is_active: true };
        if (subject) where.subjects = { has: subject };

        const tutors = await prisma.tutors.findMany({
            where,
            include: {
                users: {
                    select: { id: true, first_name: true, last_name: true, profile_picture: true, university: true }
                }
            },
            orderBy: { rating: 'desc' }
        });

        res.json(tutors);
    } catch (error) {
        console.error('Get tutors error:', error);
        res.status(500).json({ error: 'Failed to fetch tutors' });
    }
});

// ===================== GET TUTOR STATUS (for current user) =====================
// Must be before /:id
router.get('/status/me', authenticate, async (req, res) => {
    try {
        const tutor = await prisma.tutors.findUnique({
            where: { user_id: req.userId },
            select: { status: true, applied_at: true }
        });
        res.json({ tutor_status: tutor?.status ?? null, applied_at: tutor?.applied_at ?? null });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tutor status' });
    }
});

// ===================== GET MY BOOKINGS (as student) =====================
router.get('/bookings/mine', authenticate, async (req, res) => {
    try {
        const bookings = await prisma.bookings.findMany({
            where: { student_id: req.userId },
            include: {
                tutors: {
                    include: {
                        users: { select: { id: true, first_name: true, last_name: true } }
                    }
                }
            },
            orderBy: { session_date: 'desc' }
        });

        res.json(bookings);
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// ===================== GET MY BOOKINGS (as tutor) =====================
router.get('/bookings/tutor', authenticate, async (req, res) => {
    try {
        const tutor = await prisma.tutors.findUnique({ where: { user_id: req.userId } });
        if (!tutor) return res.json([]);

        const bookings = await prisma.bookings.findMany({
            where: { tutor_id: tutor.id },
            include: {
                users: { select: { id: true, first_name: true, last_name: true } }
            },
            orderBy: { session_date: 'desc' }
        });

        res.json(bookings);
    } catch (error) {
        console.error('Get tutor bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch tutor bookings' });
    }
});

// ===================== GET SINGLE TUTOR (with availability) =====================
router.get('/:id', async (req, res) => {
    try {
        const tutorId = parseInt(req.params.id);
        if (isNaN(tutorId)) return res.status(404).json({ error: 'Tutor not found' });
        const tutor = await prisma.tutors.findUnique({
            where: { id: tutorId },
            include: {
                users: {
                    select: { id: true, first_name: true, last_name: true, profile_picture: true, university: true, bio: true }
                },
                tutor_availability: {
                    where: { is_available: true }
                }
            }
        });

        if (!tutor || tutor.status !== 'approved') {
            return res.status(404).json({ error: 'Tutor not found' });
        }

        res.json(tutor);
    } catch (error) {
        console.error('Get tutor error:', error);
        res.status(500).json({ error: 'Failed to fetch tutor' });
    }
});

// ===================== UPDATE MY TUTOR PROFILE =====================
router.patch('/me', authenticate, async (req, res) => {
    try {
        const { bio, subjects, hourlyRate, yearsExperience, isActive } = req.body;
        const tutor = await prisma.tutors.findUnique({ where: { user_id: req.userId } });
        if (!tutor) return res.status(404).json({ error: 'Tutor profile not found' });

        const updated = await prisma.tutors.update({
            where: { user_id: req.userId },
            data: {
                ...(bio           !== undefined && { bio }),
                ...(subjects      !== undefined && { subjects }),
                ...(hourlyRate    !== undefined && { hourly_rate: hourlyRate }),
                ...(yearsExperience !== undefined && { years_experience: String(yearsExperience) }),
                ...(isActive      !== undefined && { is_active: isActive }),
            }
        });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update tutor profile' });
    }
});

// ===================== DELETE AVAILABILITY SLOT =====================
router.delete('/availability/:slotId', authenticate, async (req, res) => {
    try {
        const slot = await prisma.tutor_availability.findUnique({ where: { id: Number(req.params.slotId) }, include: { tutors: true } });
        if (!slot) return res.status(404).json({ error: 'Slot not found' });
        if (slot.tutors.user_id !== req.userId) return res.status(403).json({ error: 'Not authorized' });
        await prisma.tutor_availability.delete({ where: { id: slot.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete slot' });
    }
});

// ===================== GET MY AVAILABILITY =====================
router.get('/availability/me', authenticate, async (req, res) => {
    try {
        const tutor = await prisma.tutors.findUnique({ where: { user_id: req.userId } });
        if (!tutor) return res.json([]);
        const slots = await prisma.tutor_availability.findMany({ where: { tutor_id: tutor.id }, orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }] });
        res.json(slots);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

// ===================== BECOME A TUTOR =====================
router.post('/', authenticate, async (req, res) => {
    try {
        const { bio, subjects, hourlyRate, experienceYears } = req.body;

        if (!bio || !subjects || !hourlyRate) {
            return res.status(400).json({ error: 'Bio, subjects, and hourly rate are required' });
        }

        const existingTutor = await prisma.tutors.findUnique({ where: { user_id: req.userId } });
        if (existingTutor) {
            return res.status(400).json({ error: 'You are already registered as a tutor' });
        }

        const tutor = await prisma.tutors.create({
            data: {
                user_id: req.userId,
                bio,
                subjects,
                hourly_rate: hourlyRate,
                experience_years: experienceYears || 0
            }
        });

        res.status(201).json({
            success: true,
            message: 'Tutor profile created, pending approval',
            tutor
        });
    } catch (error) {
        console.error('Create tutor error:', error);
        res.status(500).json({ error: 'Failed to create tutor profile' });
    }
});

// ===================== SET AVAILABILITY =====================
router.post('/:id/availability', authenticate, async (req, res) => {
    try {
        const tutorId = parseInt(req.params.id);
        const { dayOfWeek, startTime, endTime } = req.body;

        if (!dayOfWeek || !startTime || !endTime) {
            return res.status(400).json({ error: 'Day of week, start time, and end time are required' });
        }

        const tutor = await prisma.tutors.findUnique({ where: { id: tutorId } });
        if (!tutor) {
            return res.status(404).json({ error: 'Tutor not found' });
        }
        if (tutor.user_id !== req.userId) {
            return res.status(403).json({ error: 'Not authorized to edit this tutor profile' });
        }

        const availability = await prisma.tutor_availability.create({
            data: {
                tutor_id: tutorId,
                day_of_week: dayOfWeek,
                start_time: new Date(`1970-01-01T${startTime}`),
                end_time: new Date(`1970-01-01T${endTime}`)
            }
        });

        res.status(201).json({ success: true, availability });
    } catch (error) {
        console.error('Set availability error:', error);
        res.status(500).json({ error: 'Failed to set availability' });
    }
});

// ===================== CREATE BOOKING =====================
router.post('/:id/bookings', authenticate, async (req, res) => {
    try {
        const tutorId = parseInt(req.params.id);
        if (isNaN(tutorId)) return res.status(400).json({ error: 'Invalid tutor ID' });
        const { subject, sessionDate, startTime, endTime, durationHours } = req.body;

        if (!subject || !sessionDate || !startTime || !endTime || !durationHours) {
            return res.status(400).json({ error: 'Subject, date, start/end time, and duration are required' });
        }

        const tutor = await prisma.tutors.findUnique({ where: { id: tutorId } });
        if (!tutor) {
            return res.status(404).json({ error: 'Tutor not found' });
        }

        // Price is derived server-side only — never trust an amount from the
        // client, or a booking can be created for any price the caller likes.
        const BASE_RATE = 500;
        const hours = parseFloat(durationHours);
        if (!(hours > 0)) return res.status(400).json({ error: 'Invalid session duration' });
        const amount = (parseFloat(tutor.hourly_rate) || BASE_RATE) * hours;

        // Parse times safely — pad to HH:MM if needed
        const parseTime = t => {
            const parts = String(t).split(':');
            const h = Math.min(parseInt(parts[0]) || 0, 23);
            const m = Math.min(parseInt(parts[1]) || 0, 59);
            return new Date(`1970-01-01T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
        };

        // If the student has a prepaid pack with this tutor, spend a session
        // from it instead of sending them to the payment flow.
        const credit = await consumeCredit(req.userId, tutorId);

        const booking = await prisma.bookings.create({
            data: {
                student_id: req.userId,
                tutor_id: tutorId,
                subject,
                session_date: new Date(sessionDate),
                start_time: parseTime(startTime),
                end_time: parseTime(endTime),
                duration_hours: parseFloat(durationHours),
                total_amount: credit ? 0 : amount,
                status: credit ? 'confirmed' : 'pending',
                notes: credit ? `Paid with ${credit.pack.plan} session credit` : undefined,
            }
        });

        res.status(201).json({
            success: true,
            booking,
            paidWithCredit: !!credit,
            creditsRemaining: credit ? credit.remaining : await creditBalance(req.userId, tutorId),
        });
    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// ===================== UPDATE BOOKING STATUS =====================
router.patch('/bookings/:id/status', authenticate, async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const { status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const booking = await prisma.bookings.findUnique({
            where: { id: bookingId },
            include: { tutors: true }
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const isStudent = booking.student_id === req.userId;
        const isTutor = booking.tutors.user_id === req.userId;

        if (!isStudent && !isTutor) {
            return res.status(403).json({ error: 'Not authorized to update this booking' });
        }

        // Cancelling a session that was paid with a credit puts it back on the
        // pack, so the student does not lose what they already bought.
        let creditRefunded = false;
        const wasCreditPaid = /session credit/i.test(booking.notes || '');
        if (status === 'cancelled' && booking.status !== 'cancelled' && wasCreditPaid) {
            const packs = await availableCreditPacks(booking.student_id, booking.tutor_id);
            const spent = packs.find(p => p.used > 0)
                ?? (await prisma.session_credits.findFirst({
                    where: { user_id: booking.student_id, tutor_id: booking.tutor_id, used: { gt: 0 } },
                    orderBy: { created_at: 'asc' },
                }));
            if (spent) creditRefunded = await refundCredit(spent.id);
        }

        const updated = await prisma.bookings.update({
            where: { id: bookingId },
            data: { status }
        });

        res.json({ success: true, booking: updated, creditRefunded });
    } catch (error) {
        console.error('Update booking error:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

// ── GET /tutors/:id/credits ──────────────────────────────────────────────────
// Prepaid sessions the signed-in student has left with this tutor.
router.get('/:id/credits', authenticate, async (req, res) => {
    try {
        const tutorId = parseInt(req.params.id);
        if (isNaN(tutorId)) return res.status(400).json({ error: 'Invalid tutor ID' });

        const packs = await availableCreditPacks(req.userId, tutorId);
        res.json({
            balance: packs.reduce((sum, p) => sum + (p.total - p.used), 0),
            packs: packs.map(p => ({
                id: p.id,
                plan: p.plan,
                total: p.total,
                used: p.used,
                remaining: p.total - p.used,
                expires_at: p.expires_at,
            })),
        });
    } catch (error) {
        console.error('Get credits error:', error);
        res.status(500).json({ error: 'Failed to fetch session credits' });
    }
});

module.exports = router;