import { useState, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, Lock, Smartphone, Clock } from 'lucide-react';
import api from '../../api/client';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const SERVICES = [
    { id: 'MTN', label: 'MTN MoMo', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' },
    { id: 'ORANGE', label: 'Orange Money', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' },
];

// Cameroon prefixes, mirrored from the server so we can pick the right operator
// for the user instead of letting them submit a mismatched pair.
const OPERATOR_PATTERNS = {
    MTN: /^6(?:7\d{7}|8[0-4]\d{6}|5[0-4]\d{6})$/,
    ORANGE: /^6(?:9\d{7}|5[5-9]\d{6})$/,
};

function normalizePhone(input) {
    let digits = String(input || '').replace(/\D/g, '');
    if (digits.startsWith('00237')) digits = digits.slice(5);
    else if (digits.length === 12 && digits.startsWith('237')) digits = digits.slice(3);
    return digits;
}

function detectOperator(phone) {
    return Object.keys(OPERATOR_PATTERNS).find(s => OPERATOR_PATTERNS[s].test(phone)) || null;
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000; // matches the server-side payment TTL

/**
 * PaymentModal
 *
 * The amount is resolved server-side from `order`, so this component never
 * sends a price. `amount` is display-only.
 *
 * Props:
 *   open        — boolean
 *   onClose     — () => void
 *   onSuccess   — (result) => void
 *   amount      — number (XAF), for display
 *   description — string
 *   order       — { type, noteId?, bookingId?, tutorId?, planKey? } what is being bought
 *   endpoint    — 'payments' (default) | 'premium'
 */
export default function PaymentModal({
    open,
    onClose,
    onSuccess,
    amount = 0,
    description,
    order,
    endpoint = 'payments',
}) {
    const [service, setService] = useState('MTN');
    const [phone, setPhone] = useState('');
    const [status, setStatus] = useState('idle'); // idle | sending | waiting | success | failed
    const [error, setError] = useState('');
    const pollRef = useRef(null);
    const deadlineRef = useRef(0);

    const paths = endpoint === 'premium'
        ? { initiate: '/premium/pay/initiate', status: id => `/premium/pay/status/${id}` }
        : { initiate: '/payments/initiate', status: id => `/payments/status/${id}` };

    const cleaned = normalizePhone(phone);
    const detected = detectOperator(cleaned);
    const mismatch = detected && detected !== service;
    const busy = status === 'sending' || status === 'waiting';

    const stopPolling = () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };

    // Never leave an interval running behind a closed modal.
    useEffect(() => stopPolling, []);
    useEffect(() => { if (!open) stopPolling(); }, [open]);

    // Selecting a number auto-selects its operator, so the two can't disagree.
    useEffect(() => {
        if (detected && detected !== service) setService(detected);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detected]);

    const reset = () => {
        stopPolling();
        setStatus('idle');
        setError('');
        setPhone('');
        setService('MTN');
    };

    const handleClose = () => {
        if (busy) return; // don't abandon a payment mid-flight
        reset();
        onClose();
    };

    const finish = (result) => {
        stopPolling();
        setStatus('success');
        setTimeout(() => {
            onSuccess?.(result);
            reset();
            onClose();
        }, 1600);
    };

    const fail = (message) => {
        stopPolling();
        setStatus('failed');
        setError(message);
    };

    const handlePay = async () => {
        if (cleaned.length !== 9) return setError('Enter a valid 9-digit number, e.g. 677000000');
        if (!detected) return setError('This is not a valid MTN or Orange Cameroon number');

        setError('');
        setStatus('sending');

        let txId;
        try {
            const { data } = await api.post(paths.initiate, {
                service: detected,
                payer: cleaned,
                ...order,
            });
            txId = data.txId;
        } catch (err) {
            return fail(err.response?.data?.error || 'Could not start the payment. Please try again.');
        }

        setStatus('waiting');
        deadlineRef.current = Date.now() + POLL_TIMEOUT_MS;

        let inFlight = false; // don't stack requests if one poll is slow
        pollRef.current = setInterval(async () => {
            if (inFlight) return;
            inFlight = true;
            try {
                const { data } = await api.get(paths.status(txId));
                if (data.status === 'completed') return finish(data);
                if (data.status === 'failed') return fail(data.error || 'Payment was declined.');
                if (data.status === 'processing' || Date.now() > deadlineRef.current) {
                    // The charge may still land — the server settles it in the
                    // background, so don't tell the user it failed.
                    stopPolling();
                    setStatus('processing');
                    return;
                }
            } catch {
                // transient network error — keep polling until the deadline
                if (Date.now() > deadlineRef.current) fail('Lost connection while confirming payment.');
            } finally {
                inFlight = false;
            }
        }, POLL_INTERVAL_MS);
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            closeOnBackdrop={!busy}
            closeOnEscape={!busy}
            title="Mobile Money Payment"
            size="sm"
        >
            <p className="text-sm -mt-2 mb-5 text-fg-secondary">{description}</p>

            {/* Amount */}
            <div className="text-center py-4 mb-5 rounded-xl border border-primary/15 bg-primary-subtle">
                <p className="text-3xl font-bold tabular-nums text-primary" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                    {Number(amount).toLocaleString()}
                </p>
                <p className="text-sm mt-0.5 text-fg-secondary">FCFA</p>
            </div>

            {status === 'waiting' ? (
                <div className="text-center py-6">
                    <Smartphone className="w-14 h-14 mx-auto mb-3 text-primary animate-pulse" />
                    <p className="text-lg font-bold mb-1">Check your phone</p>
                    <p className="text-sm text-fg-secondary">
                        Enter your {service === 'MTN' ? 'MTN MoMo' : 'Orange Money'} PIN on {cleaned} to approve
                        the payment. Keep this window open.
                    </p>
                </div>
            ) : status === 'processing' ? (
                <div className="text-center py-6">
                    <Clock className="w-14 h-14 mx-auto mb-3 text-fg-secondary" />
                    <p className="text-lg font-bold mb-1">Still confirming</p>
                    <p className="text-sm mb-5 text-fg-secondary">
                        We haven't heard back from the operator yet. If you approved the payment,
                        your access is unlocked automatically within a few minutes — no need to pay again.
                    </p>
                    <Button onClick={handleClose} variant="secondary">Close</Button>
                </div>
            ) : status === 'success' ? (
                <div className="text-center py-6">
                    <CheckCircle className="w-14 h-14 mx-auto mb-3 text-success" />
                    <p className="text-lg font-bold mb-1">Payment Successful!</p>
                    <p className="text-sm text-fg-secondary">Your purchase has been confirmed.</p>
                </div>
            ) : status === 'failed' ? (
                <div className="text-center py-6">
                    <XCircle className="w-14 h-14 mx-auto mb-3 text-danger" />
                    <p className="text-lg font-bold mb-1">Payment Failed</p>
                    <p className="text-sm mb-5 text-fg-secondary">{error || 'Please try again.'}</p>
                    <Button onClick={() => { setStatus('idle'); setError(''); }}>Try Again</Button>
                </div>
            ) : (
                <>
                    {/* Service selector */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {SERVICES.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setService(s.id)}
                                disabled={busy}
                                className="py-3 rounded-xl font-semibold text-sm transition-all"
                                style={{
                                    background: service === s.id ? s.bg : 'var(--surface-bg)',
                                    border: `2px solid ${service === s.id ? s.border : 'var(--border-color)'}`,
                                    color: service === s.id ? s.color : 'var(--ink-secondary)',
                                }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Phone input */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium mb-2">Phone Number</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-fg-secondary">+237</span>
                            <input
                                type="tel"
                                inputMode="numeric"
                                value={phone}
                                onChange={e => { setPhone(e.target.value); setError(''); }}
                                placeholder="6XX XXX XXX"
                                className="w-full pl-14 pr-4 py-3 rounded-xl border-2 border-border bg-bg text-fg text-sm focus:outline-none focus:border-primary"
                                disabled={busy}
                            />
                        </div>
                        {error ? (
                            <p className="text-xs mt-1.5 text-danger">{error}</p>
                        ) : cleaned.length === 9 && !detected ? (
                            <p className="text-xs mt-1.5 text-danger">Not a valid MTN or Orange Cameroon number.</p>
                        ) : mismatch ? (
                            <p className="text-xs mt-1.5 text-fg-secondary">
                                That's a {detected === 'MTN' ? 'MTN' : 'Orange'} number — switched for you.
                            </p>
                        ) : (
                            <p className="text-xs mt-1.5 text-fg-secondary">
                                You will receive a prompt on your phone to confirm the payment.
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button onClick={handleClose} disabled={busy} variant="secondary" fullWidth>
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePay}
                            disabled={busy || cleaned.length !== 9 || !detected}
                            loading={status === 'sending'}
                            fullWidth
                            className="hover:scale-[1.02]"
                        >
                            {status === 'sending' ? 'Sending…' : `Pay ${Number(amount).toLocaleString()} FCFA`}
                        </Button>
                    </div>
                </>
            )}

            <p className="text-xs text-center mt-4 flex items-center justify-center gap-1 text-fg-secondary">
                <Lock size={11} /> Secured by MeSomb · MTN MoMo &amp; Orange Money
            </p>
        </Modal>
    );
}
