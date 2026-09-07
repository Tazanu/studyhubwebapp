const express = require('express');
const prisma = require('../prisma');
const authenticate = require('../middleware/auth');
const { validatePayer, initiateCollect, checkStatus } = require('../services/mobileMoney');
const { resolveOrder, completeOrder, failOrder, describeGranted, OrderError } = require('../services/entitlements');

const router = express.Router();

// How long a pending payment may sit before we give up on it.
const PAYMENT_TTL_MS = 5 * 60 * 1000;

/**
 * POST /payments/initiate
 *
 * Body: { service: 'MTN'|'ORANGE', payer, type, noteId?, bookingId?, tutorId?, planKey? }
 *
 * The amount is NEVER taken from the client - it is resolved from the database
 * by `resolveOrder`. Returns immediately with a txId; the client then polls
 * /payments/status/:txId while the payer approves the USSD prompt.
 */
router.post('/initiate', authenticate, async (req, res) => {
    try {
        const { service, payer, type, noteId, bookingId, tutorId, planKey } = req.body;

        const check = validatePayer(service, payer);
        if (!check.ok) return res.status(400).json({ error: check.error });

        const order = await resolveOrder(req.userId, { type, noteId, bookingId, tutorId, planKey });

        if (!(order.amount > 0)) {
            return res.status(400).json({ error: 'This item has no price set. Contact support.' });
        }

        const tx = await prisma.transactions.create({
            data: {
                user_id: req.userId,
                amount: order.amount,
                type: order.type,
                status: 'pending',
                description: order.description,
                metadata: order.metadata,
            },
        });

        let reference;
        try {
            reference = await initiateCollect({
                amount: order.amount,
                service: check.service,
                payer: check.payer,
                description: order.description,
                externalId: tx.id,
            });
        } catch (err) {
            await failOrder(tx.id);
            console.error('MeSomb initiate error:', err.message);
            return res.status(502).json({ error: 'Could not reach the payment provider. Please try again.' });
        }

        await prisma.transactions.update({ where: { id: tx.id }, data: { reference } });

        res.json({
            success: true,
            txId: tx.id,
            amount: order.amount,
            description: order.description,
            message: 'Check your phone and enter your PIN to approve the payment.',
        });
    } catch (err) {
        if (err instanceof OrderError) return res.status(err.status).json({ error: err.message });
        console.error('Initiate payment error:', err);
        res.status(500).json({ error: 'Failed to initiate payment' });
    }
});

/**
 * GET /payments/status/:txId
 *
 * Polled by the client every few seconds. Grants the entitlement the moment
 * the provider reports SUCCESS. Idempotent - concurrent polls are safe.
 */
router.get('/status/:txId', authenticate, async (req, res) => {
    try {
        const txId = parseInt(req.params.txId);
        if (!txId) return res.status(400).json({ error: 'Invalid transaction ID' });

        const tx = await prisma.transactions.findUnique({ where: { id: txId } });
        if (!tx || tx.user_id !== req.userId) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (tx.status === 'completed') {
            return res.json({ status: 'completed', ...(await describeGranted(tx)) });
        }
        if (tx.status === 'failed') {
            return res.json({ status: 'failed', error: 'Payment was declined or timed out.' });
        }

        // Pending. If the provider never gave us a reference there is nothing to
        // poll, so expire it rather than leaving the row stranded forever.
        const age = Date.now() - new Date(tx.created_at).getTime();
        if (!tx.reference) {
            if (age > PAYMENT_TTL_MS) {
                await failOrder(txId);
                return res.json({ status: 'failed', error: 'Payment could not be started. Please try again.' });
            }
            return res.json({ status: 'pending' });
        }

        let providerStatus;
        try {
            providerStatus = await checkStatus(tx.reference);
        } catch (err) {
            console.error('checkStatus error:', err.message);
            return res.json({ status: 'pending' }); // transient - keep polling
        }

        if (providerStatus === 'SUCCESS') {
            const granted = await completeOrder(txId);
            return res.json({ status: 'completed', ...granted });
        }

        if (providerStatus === 'FAILED') {
            await failOrder(txId);
            return res.json({ status: 'failed', error: 'Payment was declined. Please try again.' });
        }

        // Still pending on the provider side. Do NOT mark it failed here - the
        // payer may still be approving, and the money could land after the page
        // gives up. Tell the client to stop waiting and let the background
        // reconciler settle it.
        if (age > PAYMENT_TTL_MS) {
            return res.json({
                status: 'processing',
                message: 'Still waiting on the operator. If you approved the payment, access is granted automatically within a few minutes.',
            });
        }

        res.json({ status: 'pending' });
    } catch (err) {
        if (err instanceof OrderError) return res.status(err.status).json({ error: err.message });
        console.error('Poll status error:', err);
        res.status(500).json({ error: 'Failed to check payment status' });
    }
});

/** GET /payments/transactions - the caller's own payment history. */
router.get('/transactions', authenticate, async (req, res) => {
    try {
        const transactions = await prisma.transactions.findMany({
            where: { user_id: req.userId },
            orderBy: { created_at: 'desc' },
        });
        res.json(transactions);
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

module.exports = router;
