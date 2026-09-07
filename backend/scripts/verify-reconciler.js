/**
 * Proves the "payer closed the tab" case is covered: a pending transaction the
 * browser never finished polling is settled by the background sweep.
 *
 * The provider call is stubbed so no real money moves.
 */
require('dotenv').config();
const Module = require('module');
const prisma = require('../src/prisma');

// Stub checkStatus before the reconciler pulls it in.
const mobileMoneyPath = require.resolve('../src/services/mobileMoney');
require(mobileMoneyPath);
let stubbedStatus = 'PENDING';
require.cache[mobileMoneyPath].exports.checkStatus = async () => stubbedStatus;

const { sweepOnce } = require('../src/services/reconciler');

const results = [];
const check = (name, pass, detail) => {
    results.push(pass);
    console.log((pass ? 'PASS  ' : 'FAIL  ') + name + (detail ? '   -> ' + detail : ''));
};

const BUYER = 3;

(async () => {
    let note, tx;
    try {
        note = await prisma.notes.create({
            data: {
                title: 'TMP RECONCILER TEST - delete me',
                description: 'temporary fixture',
                subject: 'Test',
                file_path: 'https://example.com/abandoned.pdf',
                file_type: 'pdf',
                uploaded_by: 1,
                is_premium: true,
                price: 300,
            },
        });

        // A payment the browser walked away from: pending, has a provider ref.
        tx = await prisma.transactions.create({
            data: {
                user_id: BUYER,
                amount: 300,
                type: 'paid_note',
                status: 'pending',
                description: 'abandoned payment',
                metadata: { noteId: note.id },
                reference: 'TEST-RECON-' + Date.now(),
            },
        });

        // Sweep 1: provider still says pending -> left alone.
        stubbedStatus = 'PENDING';
        let r = await sweepOnce();
        let row = await prisma.transactions.findUnique({ where: { id: tx.id } });
        check('pending payment is left pending', row.status === 'pending', `status=${row.status}, checked=${r.checked}`);

        // Sweep 2: payer approved late -> settled and access granted.
        stubbedStatus = 'SUCCESS';
        r = await sweepOnce();
        row = await prisma.transactions.findUnique({ where: { id: tx.id } });
        check('late approval is settled by the sweep', row.status === 'completed', `status=${row.status}`);

        const { hasPurchasedPaidNote } = require('../src/services/entitlements');
        check('access granted without the browser polling',
            (await hasPurchasedPaidNote(BUYER, note.id)) === true, 'entitlement present');

        // Sweep 3: already settled -> not touched again.
        const before = await prisma.transactions.count({ where: { user_id: BUYER, status: 'completed' } });
        r = await sweepOnce();
        const after = await prisma.transactions.count({ where: { user_id: BUYER, status: 'completed' } });
        check('settled payment is not re-processed', before === after, `completed count ${before} -> ${after}`);

        // Declined payment path.
        const tx2 = await prisma.transactions.create({
            data: {
                user_id: BUYER,
                amount: 300,
                type: 'paid_note',
                status: 'pending',
                description: 'declined payment',
                metadata: { noteId: note.id },
                reference: 'TEST-RECON-FAIL-' + Date.now(),
            },
        });
        stubbedStatus = 'FAILED';
        await sweepOnce();
        const row2 = await prisma.transactions.findUnique({ where: { id: tx2.id } });
        check('declined payment is marked failed', row2.status === 'failed', `status=${row2.status}`);
        await prisma.transactions.delete({ where: { id: tx2.id } });

    } finally {
        if (tx) await prisma.transactions.deleteMany({ where: { reference: { startsWith: 'TEST-RECON' } } });
        if (note) await prisma.notes.deleteMany({ where: { id: note.id } });
        console.log('\ncleaned up fixtures');
        await prisma.$disconnect();
    }

    const failed = results.filter(p => !p).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);
    process.exit(failed ? 1 : 0);
})();
