/**
 * Background settlement of pending payments.
 *
 * The browser poll is a convenience, not the source of truth: a payer can close
 * the tab, lose signal, or approve the USSD prompt after the page gave up. This
 * sweep is what guarantees a successful charge eventually grants access, and
 * that abandoned attempts do not sit pending forever.
 */
const prisma = require('../prisma');
const { checkStatus } = require('./mobileMoney');
const { completeOrder, failOrder } = require('./entitlements');

const SWEEP_INTERVAL_MS = Number(process.env.RECONCILE_INTERVAL_MS || 60_000);
// Give the provider well past the UI timeout before declaring an attempt dead,
// so a slow approval is never written off while the money is in flight.
const ABANDON_AFTER_MS = Number(process.env.RECONCILE_ABANDON_MS || 30 * 60_000);
// Ignore anything ancient — those need manual review, not an automated verdict.
const LOOKBACK_MS = Number(process.env.RECONCILE_LOOKBACK_MS || 24 * 60 * 60_000);

let timer = null;
let running = false;

async function sweepOnce() {
    if (running) return { skipped: true };
    running = true;

    const now = Date.now();
    let settled = 0;
    let failed = 0;

    try {
        const pending = await prisma.transactions.findMany({
            where: {
                status: 'pending',
                reference: { not: null },
                created_at: { gt: new Date(now - LOOKBACK_MS) },
            },
            select: { id: true, reference: true, created_at: true },
            take: 100,
        });

        for (const tx of pending) {
            let status;
            try {
                status = await checkStatus(tx.reference);
            } catch (err) {
                console.error(`[reconciler] tx ${tx.id} status check failed:`, err.message);
                continue; // try again next sweep
            }

            if (status === 'SUCCESS') {
                try {
                    await completeOrder(tx.id);
                    settled++;
                    console.log(`[reconciler] settled tx ${tx.id} (payer approved after the page stopped polling)`);
                } catch (err) {
                    console.error(`[reconciler] tx ${tx.id} grant failed:`, err.message);
                }
            } else if (status === 'FAILED') {
                await failOrder(tx.id);
                failed++;
            } else if (now - new Date(tx.created_at).getTime() > ABANDON_AFTER_MS) {
                await failOrder(tx.id);
                failed++;
                console.log(`[reconciler] abandoned tx ${tx.id} (still pending after ${Math.round(ABANDON_AFTER_MS / 60000)}m)`);
            }
        }

        return { checked: pending.length, settled, failed };
    } finally {
        running = false;
    }
}

function start() {
    if (timer) return;
    timer = setInterval(() => {
        sweepOnce().catch(err => console.error('[reconciler] sweep error:', err.message));
    }, SWEEP_INTERVAL_MS);
    timer.unref?.(); // never hold the process open
    console.log(`[reconciler] settling pending payments every ${SWEEP_INTERVAL_MS / 1000}s`);
}

function stop() {
    if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { start, stop, sweepOnce };
