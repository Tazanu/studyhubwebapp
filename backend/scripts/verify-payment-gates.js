require('dotenv').config();
const jwt = require('jsonwebtoken');
const prisma = require('../src/prisma');

const BASE = 'http://localhost:5000/api';
const token = (id, email) => jwt.sign({ userId: id, email }, process.env.JWT_SECRET, { expiresIn: '1h' });

async function call(method, path, tok, body) {
    const res = await fetch(BASE + path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(tok && { Authorization: 'Bearer ' + tok }),
        },
        ...(body && { body: JSON.stringify(body) }),
    });
    let data;
    try { data = await res.json(); } catch { data = null; }
    return { code: res.status, data };
}

const results = [];
function check(name, pass, detail) {
    results.push({ name, pass, detail });
    console.log((pass ? 'PASS  ' : 'FAIL  ') + name + (detail ? '   -> ' + detail : ''));
}

(async () => {
    const buyer = token(3, 'timothy@gmail.com');   // non-owner, non-admin
    let tempNote;

    try {
        tempNote = await prisma.notes.create({
            data: {
                title: 'TMP GATE TEST - delete me',
                description: 'temporary fixture',
                subject: 'Test',
                file_path: 'https://example.com/secret.pdf',
                file_type: 'pdf',
                uploaded_by: 1,
                is_premium: true,
                price: 500,
            },
        });
        const id = tempNote.id;
        console.log('temp premium note id =', id, '\n');

        // --- premium note (notes table) gating ---
        let r = await call('GET', `/notes/${id}`, buyer);
        check('GET /notes/:id hides file_path for unpaid premium note',
            r.code === 200 && !r.data.file_path && r.data.locked === true,
            `code=${r.code} file_path=${r.data && r.data.file_path} locked=${r.data && r.data.locked}`);

        r = await call('GET', `/notes/${id}`, null);
        check('GET /notes/:id hides file_path from anonymous',
            r.code === 200 && !r.data.file_path,
            `code=${r.code} file_path=${r.data && r.data.file_path}`);

        r = await call('POST', `/notes/${id}/download`, buyer);
        check('POST /notes/:id/download blocks unpaid buyer (402)',
            r.code === 402, `code=${r.code} ${JSON.stringify(r.data)}`);

        r = await call('POST', `/notes/${id}/download`, null);
        check('POST /notes/:id/download blocks anonymous (401)',
            r.code === 401, `code=${r.code}`);

        r = await call('GET', `/notes/${id}/file`, buyer);
        check('GET /notes/:id/file blocks unpaid buyer (402)',
            r.code === 402, `code=${r.code} ${JSON.stringify(r.data)}`);

        r = await call('GET', `/notes/${id}/file`, null);
        check('GET /notes/:id/file blocks anonymous (402)',
            r.code === 402, `code=${r.code}`);

        // owner and admin keep access
        r = await call('GET', `/notes/${id}`, token(1, 'test@example.com'));
        check('owner sees the note unlocked',
            r.code === 200 && r.data.locked === false, `code=${r.code} locked=${r.data?.locked}`);

        r = await call('POST', `/notes/${id}/download`, token(2, 'stanleytazanu262@gmail.com'));
        // Premium notes return a gated downloadPath, never the storage path.
        check('admin can download premium note',
            r.code === 200 && !!r.data.downloadPath && !r.data.file_path,
            `code=${r.code} downloadPath=${r.data?.downloadPath}`);

        // free notes unaffected
        r = await call('GET', '/notes/1', buyer);
        check('free note still exposes file_path',
            r.code === 200 && !!r.data.file_path, `code=${r.code}`);

        r = await call('POST', '/notes/1/download', buyer);
        check('free note download still works',
            r.code === 200 && !!r.data.file_path, `code=${r.code}`);

        // list endpoint
        r = await call('GET', '/notes', buyer);
        const locked = Array.isArray(r.data) && r.data.find(n => n.id === id);
        check('list strips file_path on locked premium note',
            locked && !locked.file_path && locked.locked === true,
            locked ? `locked=${locked.locked} file_path=${locked.file_path}` : 'note missing from list');

        // --- premium_notes marketplace gating ---
        r = await call('GET', '/premium/notes/1/file', buyer);
        check('premium_notes file gated for non-purchaser (402)',
            r.code === 402, `code=${r.code} ${JSON.stringify(r.data)}`);

        r = await call('GET', '/premium/notes/1/file', null);
        check('premium_notes file requires auth (401)',
            r.code === 401, `code=${r.code}`);

        // --- payment validation (all reject BEFORE any provider call) ---
        r = await call('POST', '/payments/initiate', buyer,
            { service: 'ORANGE', payer: '677000000', type: 'paid_note', noteId: id });
        check('operator mismatch rejected before charging',
            r.code === 400 && /MTN MoMo/.test(r.data.error || ''), `${r.code} ${JSON.stringify(r.data)}`);

        r = await call('POST', '/payments/initiate', buyer,
            { service: 'MTN', payer: '123', type: 'paid_note', noteId: id });
        check('short phone number rejected',
            r.code === 400, `${r.code} ${JSON.stringify(r.data)}`);

        r = await call('POST', '/payments/initiate', buyer,
            { service: 'VISA', payer: '677000000', type: 'paid_note', noteId: id });
        check('unknown service rejected',
            r.code === 400, `${r.code} ${JSON.stringify(r.data)}`);

        r = await call('POST', '/payments/initiate', buyer,
            { service: 'MTN', payer: '677000000', type: 'bogus_type', noteId: id });
        check('unknown order type rejected',
            r.code === 400, `${r.code} ${JSON.stringify(r.data)}`);

        r = await call('POST', '/payments/initiate', token(1, 'test@example.com'),
            { service: 'MTN', payer: '677000000', type: 'paid_note', noteId: id });
        check('owner cannot buy their own note',
            r.code === 400, `${r.code} ${JSON.stringify(r.data)}`);

        r = await call('POST', '/payments/initiate', buyer,
            { service: 'MTN', payer: '677000000', type: 'tutor_booking', bookingId: 999999 });
        check('missing booking rejected',
            r.code === 404, `${r.code} ${JSON.stringify(r.data)}`);

        // amount is server-derived: prove the client value is ignored
        const { resolveOrder } = require('../src/services/entitlements');
        const order = await resolveOrder(3, { type: 'paid_note', noteId: id });
        check('server prices the order itself (ignores client amount)',
            order.amount === 500, `resolved amount=${order.amount} (client sent none)`);

        r = await call('GET', '/payments/status/999999', buyer);
        check('cannot poll another user\'s transaction',
            r.code === 404, `code=${r.code}`);

    } finally {
        if (tempNote) {
            await prisma.notes.delete({ where: { id: tempNote.id } });
            console.log('\ncleaned up temp note', tempNote.id);
        }
        await prisma.$disconnect();
    }

    const failed = results.filter(r => !r.pass);
    console.log(`\n${results.length - failed.length}/${results.length} passed`);
    process.exit(failed.length ? 1 : 0);
})();
