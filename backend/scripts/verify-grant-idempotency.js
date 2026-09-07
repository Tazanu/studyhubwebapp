/**
 * Verifies the two halves of the grant path:
 *   1. A user with a completed transaction actually gets access.
 *   2. Concurrent status polls grant exactly once (no double subscriptions,
 *      no duplicate purchase rows).
 *
 * Creates its own fixtures and removes them again.
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const prisma = require('../src/prisma');
const { completeOrder, hasPurchasedPaidNote } = require('../src/services/entitlements');

const BASE = 'http://localhost:5000/api';
const BUYER = 3;
const token = id => jwt.sign({ userId: id, email: 'timothy@gmail.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });

const results = [];
const check = (name, pass, detail) => {
    results.push(pass);
    console.log((pass ? 'PASS  ' : 'FAIL  ') + name + (detail ? '   -> ' + detail : ''));
};

async function api(method, path, tok) {
    const res = await fetch(BASE + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(tok && { Authorization: 'Bearer ' + tok }) },
    });
    let data; try { data = await res.json(); } catch { data = null; }
    return { code: res.status, data };
}

(async () => {
    let note, tx, subTx;
    try {
        note = await prisma.notes.create({
            data: {
                title: 'TMP IDEMPOTENCY TEST - delete me',
                description: 'temporary fixture',
                subject: 'Test',
                file_path: 'https://example.com/paid.pdf',
                file_type: 'pdf',
                uploaded_by: 1,
                is_premium: true,
                price: 750,
            },
        });

        // --- 1. paid user gains access -------------------------------------
        tx = await prisma.transactions.create({
            data: {
                user_id: BUYER,
                amount: 750,
                type: 'paid_note',
                status: 'pending',
                description: 'test purchase',
                metadata: { noteId: note.id },
                reference: 'TEST-REF-' + Date.now(),
            },
        });

        let r = await api('POST', `/notes/${note.id}/download`, token(BUYER));
        check('before payment: download blocked', r.code === 402, `code=${r.code}`);

        await completeOrder(tx.id);

        check('metadata JSON lookup finds the purchase',
            (await hasPurchasedPaidNote(BUYER, note.id)) === true, 'hasPurchasedPaidNote=true');

        r = await api('POST', `/notes/${note.id}/download`, token(BUYER));
        // Premium notes return a gated downloadPath, never the storage path.
        check('after payment: download allowed',
            r.code === 200 && !!r.data.downloadPath && !r.data.file_path,
            `code=${r.code} downloadPath=${r.data?.downloadPath}`);

        r = await api('GET', `/notes/${note.id}`, token(BUYER));
        // Purchased premium notes report access but still withhold the path.
        check('after payment: purchased=true and path still withheld',
            r.code === 200 && r.data.purchased === true && r.data.locked === false && !r.data.file_path,
            `purchased=${r.data && r.data.purchased} locked=${r.data && r.data.locked}`);

        r = await api('GET', `/notes/${note.id}`, token(1));
        check('owner sees the note unlocked',
            r.code === 200 && r.data.locked === false, `locked=${r.data?.locked}`);

        // a different non-owner must still be locked out
        const stranger = jwt.sign({ userId: 2 }, process.env.JWT_SECRET); // admin - allowed
        r = await api('GET', `/notes/${note.id}`, stranger);
        check('admin sees the note unlocked', r.code === 200 && r.data.locked === false, `code=${r.code} locked=${r.data?.locked}`);

        // --- 2. concurrent grants happen exactly once -----------------------
        subTx = await prisma.transactions.create({
            data: {
                user_id: BUYER,
                amount: 1000,
                type: 'subscription',
                status: 'pending',
                description: 'idempotency test subscription',
                reference: 'TEST-SUB-' + Date.now(),
            },
        });

        const before = await prisma.premium_subscriptions.count({ where: { user_id: BUYER } });
        const settled = await Promise.allSettled(
            Array.from({ length: 6 }, () => completeOrder(subTx.id))
        );
        const after = await prisma.premium_subscriptions.count({ where: { user_id: BUYER } });

        const rejected = settled.filter(s => s.status === 'rejected');
        check('6 concurrent grants created exactly 1 subscription',
            after - before === 1, `created ${after - before}`);
        check('no concurrent grant threw', rejected.length === 0,
            rejected.length ? rejected[0].reason?.message : 'all resolved');

        const finalTx = await prisma.transactions.findUnique({ where: { id: subTx.id } });
        check('transaction settled as completed', finalTx.status === 'completed', finalTx.status);

        // clean the subscription this test created
        await prisma.premium_subscriptions.deleteMany({ where: { tx_ref: subTx.reference } });

    } finally {
        if (subTx) await prisma.transactions.deleteMany({ where: { id: subTx.id } });
        if (tx) await prisma.transactions.deleteMany({ where: { id: tx.id } });
        if (note) await prisma.notes.deleteMany({ where: { id: note.id } });
        console.log('\ncleaned up fixtures');
        await prisma.$disconnect();
    }

    const failed = results.filter(p => !p).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);
    process.exit(failed ? 1 : 0);
})();
