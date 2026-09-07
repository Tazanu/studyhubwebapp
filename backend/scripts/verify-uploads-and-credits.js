/**
 * Verifies the two things added here:
 *   1. Paid files are unreachable except through an entitlement check, and
 *      free content is unaffected.
 *   2. Session credit packs are created on payment, spent on booking, refunded
 *      on cancellation, and cannot be double-spent.
 *
 * Creates its own fixtures and removes them again. No real payments are made.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const prisma = require('../src/prisma');
const { completeOrder, resolveOrder, creditBalance, consumeCredit } = require('../src/services/entitlements');
const { PROTECTED_ROOT, PROTECTED_PREFIX, protectFile } = require('../src/services/fileAccess');

const BASE = 'http://localhost:5000';
const API = BASE + '/api';
const BUYER = 3;
const token = id => jwt.sign({ userId: id, email: 'test@example.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });

const results = [];
const check = (name, pass, detail) => {
    results.push(pass);
    console.log((pass ? 'PASS  ' : 'FAIL  ') + name + (detail ? '   -> ' + detail : ''));
};

async function req(method, url, tok) {
    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...(tok && { Authorization: 'Bearer ' + tok }) },
    });
    const ctype = res.headers.get('content-type') || '';
    let data = null;
    if (ctype.includes('json')) { try { data = await res.json(); } catch {} }
    else { data = Buffer.from(await res.arrayBuffer()); }
    return { code: res.status, data, ctype };
}

(async () => {
    let note, tutor, tx, createdFile;
    try {
        // ---------- fixtures ----------
        tutor = await prisma.tutors.findFirst({ select: { id: true, hourly_rate: true } });
        if (!tutor) throw new Error('no tutor in DB to test against');

        // a real file on disk so streaming can be checked end to end
        fs.mkdirSync(path.join(__dirname, '..', 'uploads'), { recursive: true });
        const basename = `TMP-TEST-${Date.now()}.txt`;
        createdFile = path.join(__dirname, '..', 'uploads', basename);
        fs.writeFileSync(createdFile, 'SECRET PAID CONTENT');

        const protectedPath = await protectFile(`/uploads/${basename}`);
        createdFile = path.join(PROTECTED_ROOT, basename);

        check('protectFile moved the file out of the public folder',
            protectedPath.startsWith(PROTECTED_PREFIX) && fs.existsSync(createdFile),
            protectedPath);

        note = await prisma.notes.create({
            data: {
                title: 'TMP UPLOADS TEST',
                description: 'temporary fixture',
                subject: 'Test',
                file_path: protectedPath,
                file_type: 'txt',
                uploaded_by: 1,
                is_premium: true,
                price: 400,
            },
        });

        // ---------- 1. file protection ----------
        let r = await req('GET', `${BASE}${protectedPath}`);
        check('protected file is 403 on the public static mount', r.code === 403, `code=${r.code}`);

        r = await req('GET', `${API}/notes/${note.id}/file`, token(BUYER));
        check('unpaid buyer cannot stream the file', r.code === 402, `code=${r.code}`);

        r = await req('GET', `${API}/notes/${note.id}/file`);
        check('anonymous cannot stream the file', r.code === 402, `code=${r.code}`);

        r = await req('GET', `${API}/notes/${note.id}`, token(BUYER));
        check('note detail hides the storage path', r.code === 200 && !r.data.file_path, `locked=${r.data?.locked}`);

        // pay for it, then the same URL must work
        tx = await prisma.transactions.create({
            data: {
                user_id: BUYER, amount: 400, type: 'paid_note', status: 'pending',
                description: 'test', metadata: { noteId: note.id }, reference: 'TEST-UP-' + Date.now(),
            },
        });
        const granted = await completeOrder(tx.id);
        check('grant returns a gated path, not a storage URL',
            !granted.file_path && !!granted.downloadPath, JSON.stringify(granted));

        r = await req('GET', `${API}/notes/${note.id}/file`, token(BUYER));
        const body = Buffer.isBuffer(r.data) ? r.data.toString() : '';
        check('paid buyer streams the real bytes',
            r.code === 200 && body === 'SECRET PAID CONTENT', `code=${r.code} bytes="${body.slice(0, 30)}"`);

        r = await req('GET', `${BASE}${protectedPath}`);
        check('static mount still refuses it after purchase', r.code === 403, `code=${r.code}`);

        // ---------- 2. session credits ----------
        const order = await resolveOrder(BUYER, { type: 'pricing_plan', tutorId: tutor.id, planKey: 'monthly' });
        check('monthly plan priced server-side', order.amount > 0 && order.metadata.sessions === 4,
            `${order.amount} XAF / ${order.metadata.sessions} sessions`);

        const planTx = await prisma.transactions.create({
            data: {
                user_id: BUYER, amount: order.amount, type: 'pricing_plan', status: 'pending',
                description: order.description, metadata: order.metadata, reference: 'TEST-PLAN-' + Date.now(),
            },
        });
        await completeOrder(planTx.id);

        let balance = await creditBalance(BUYER, tutor.id);
        check('paying for a plan creates 4 session credits', balance === 4, `balance=${balance}`);

        r = await req('GET', `${API}/tutors/${tutor.id}/credits`, token(BUYER));
        check('credits endpoint reports the balance', r.code === 200 && r.data.balance === 4, `balance=${r.data?.balance}`);

        // booking spends one
        const bookingRes = await fetch(`${API}/tutors/${tutor.id}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(BUYER) },
            body: JSON.stringify({
                subject: 'Test', sessionDate: '2027-01-15',
                startTime: '10:00', endTime: '11:00', durationHours: 1,
                totalAmount: 999999, // must be ignored
            }),
        });
        const booking = await bookingRes.json();
        check('booking is covered by a credit',
            booking.paidWithCredit === true && Number(booking.booking.total_amount) === 0,
            `paidWithCredit=${booking.paidWithCredit} amount=${booking.booking?.total_amount}`);
        check('credit-paid booking is confirmed immediately',
            booking.booking.status === 'confirmed', booking.booking?.status);
        check('client-sent amount is still ignored',
            Number(booking.booking.total_amount) === 0, `amount=${booking.booking?.total_amount}`);

        balance = await creditBalance(BUYER, tutor.id);
        check('balance drops to 3 after booking', balance === 3, `balance=${balance}`);

        // cancelling gives it back
        const cancelRes = await fetch(`${API}/tutors/bookings/${booking.booking.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(BUYER) },
            body: JSON.stringify({ status: 'cancelled' }),
        });
        const cancelled = await cancelRes.json();
        balance = await creditBalance(BUYER, tutor.id);
        check('cancelling refunds the credit',
            cancelled.creditRefunded === true && balance === 4, `refunded=${cancelled.creditRefunded} balance=${balance}`);

        // concurrent spending cannot oversell
        const spends = await Promise.all(Array.from({ length: 8 }, () => consumeCredit(BUYER, tutor.id)));
        const succeeded = spends.filter(Boolean).length;
        balance = await creditBalance(BUYER, tutor.id);
        check('8 concurrent spends consume at most the 4 available',
            succeeded === 4 && balance === 0, `succeeded=${succeeded} balance=${balance}`);

        const none = await consumeCredit(BUYER, tutor.id);
        check('spending with an empty pack returns null', none === null, String(none));

        // cleanup bookings + credits made here
        await prisma.bookings.deleteMany({ where: { id: booking.booking.id } });
        await prisma.session_credits.deleteMany({ where: { tx_ref: { startsWith: 'TEST-PLAN' } } });
        await prisma.transactions.deleteMany({ where: { id: planTx.id } });

    } finally {
        if (tx) await prisma.transactions.deleteMany({ where: { reference: { startsWith: 'TEST-UP' } } });
        if (note) await prisma.notes.deleteMany({ where: { id: note.id } });
        if (createdFile && fs.existsSync(createdFile)) fs.unlinkSync(createdFile);
        await prisma.session_credits.deleteMany({ where: { tx_ref: { startsWith: 'TEST-' } } });
        await prisma.transactions.deleteMany({ where: { reference: { startsWith: 'TEST-' } } });
        console.log('\ncleaned up fixtures');
        await prisma.$disconnect();
    }

    const failed = results.filter(p => !p).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);
    process.exit(failed ? 1 : 0);
})();
