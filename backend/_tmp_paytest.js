/**
 * Exercises everything that happens AFTER a payment settles, without moving
 * money: completeOrder is the exact function both the status poll and the
 * background reconciler call once the operator confirms.
 *
 * Runs against the LIVE database so the notification and receipt are real.
 */
require('dotenv').config();
const prisma = require('./src/prisma');
const { completeOrder, failOrder } = require('./src/services/entitlements');

const R = [];
const check = (n, p, d = '') => { R.push(p); console.log(`${(p ? 'PASS' : 'FAIL').padEnd(5)} ${n.padEnd(48)} ${d}`); };

(async () => {
    // A throwaway buyer, so nothing touches the real accounts.
    const buyer = await prisma.users.create({
        data: {
            email: `paytest.${Date.now()}@studyhub.test`,
            password: 'x'.repeat(60), first_name: 'Pay', last_name: 'Test',
        },
    });
    // Avoids newer columns: the local Prisma client is stale while the dev
    // server holds the engine lock.
    const note = await prisma.premium_notes.findFirst({ where: { id: 3 } });
    console.log(`  buyer ${buyer.id}, note ${note.id} "${note.title}" @ ${note.price} FCFA\n`);

    // ── SUCCESS PATH ────────────────────────────────────────────────────────
    console.log('──── successful payment ────');
    const okTx = await prisma.transactions.create({
        data: {
            user_id: buyer.id, amount: note.price, type: 'note_purchase', status: 'pending',
            reference: 'TEST-REF-' + Date.now(),
            description: `Purchase premium note: ${note.title}`,
            metadata: { noteId: note.id, noteTitle: note.title, service: 'MTN', payerMasked: '677***11' },
        },
    });

    const granted = await completeOrder(okTx.id);
    const settled = await prisma.transactions.findUnique({ where: { id: okTx.id } });
    check('transaction marked completed', settled.status === 'completed', settled.status);
    check('access granted', granted?.type === 'note_purchase' && granted?.noteId === note.id, JSON.stringify(granted));

    const purchase = await prisma.purchased_notes.findFirst({ where: { user_id: buyer.id, premium_note_id: note.id } });
    check('purchase recorded (buyer now owns it)', !!purchase, purchase ? `amount ${purchase.amount_paid}` : 'missing');

    const okNotes = await prisma.notifications.findMany({ where: { user_id: buyer.id } });
    const success = okNotes.find(n => n.type === 'payment_success');
    check('payer notified of success', !!success, success ? '' : 'NO NOTIFICATION');
    if (success) console.log(`       "${success.message}"`);

    // idempotency: the poll and the reconciler can both settle the same tx
    await completeOrder(okTx.id);
    const dupes = await prisma.notifications.count({ where: { user_id: buyer.id, type: 'payment_success' } });
    check('no duplicate notification on re-settle', dupes === 1, `${dupes} notification(s)`);

    // ── FAILURE PATH ────────────────────────────────────────────────────────
    console.log('\n──── failed payment ────');
    const badTx = await prisma.transactions.create({
        data: {
            user_id: buyer.id, amount: note.price, type: 'note_purchase', status: 'pending',
            description: `Purchase premium note: ${note.title}`,
            metadata: { noteId: note.id, noteTitle: note.title, service: 'MTN', payerMasked: '677***11' },
        },
    });
    await failOrder(badTx.id);
    const failed = await prisma.transactions.findUnique({ where: { id: badTx.id } });
    check('transaction marked failed', failed.status === 'failed', failed.status);

    const failNote = await prisma.notifications.findFirst({ where: { user_id: buyer.id, type: 'payment_failed' } });
    check('payer notified of failure', !!failNote, failNote ? '' : 'NO NOTIFICATION');
    if (failNote) console.log(`       "${failNote.message}"`);

    await failOrder(badTx.id);
    const failDupes = await prisma.notifications.count({ where: { user_id: buyer.id, type: 'payment_failed' } });
    check('no duplicate on re-fail', failDupes === 1, `${failDupes} notification(s)`);

    console.log(`\n════ ${R.filter(Boolean).length}/${R.length} passed ════`);
    console.log('cleanup:', JSON.stringify({ buyer: buyer.id, okTx: okTx.id, badTx: badTx.id }));
    await prisma.$disconnect();
})();
