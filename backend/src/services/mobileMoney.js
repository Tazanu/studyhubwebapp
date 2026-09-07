/**
 * Mobile Money provider adapter (MeSomb — MTN MoMo & Orange Money, Cameroon).
 *
 * Centralises every provider concern so routes never talk to the SDK directly:
 *   - phone normalisation (accepts +237/237/spaces, stores 9-digit local form)
 *   - operator detection + validation against the selected service
 *   - collect requests issued in ASYNCHRONOUS mode so the HTTP request returns
 *     immediately and the caller polls for the outcome
 *   - status polling normalised to PENDING | SUCCESS | FAILED
 */
const { getPaymentClient, RandomGenerator } = require('../mesomb');

const SERVICES = ['MTN', 'ORANGE'];

// Cameroon mobile prefixes (9-digit local form, all start with 6)
const OPERATOR_PATTERNS = {
    MTN: /^6(?:7\d{7}|8[0-4]\d{6}|5[0-4]\d{6})$/,
    ORANGE: /^6(?:9\d{7}|5[5-9]\d{6})$/,
};

/** Strip formatting and country code down to the 9-digit local number. */
function normalizePhone(input) {
    let digits = String(input || '').replace(/\D/g, '');
    if (digits.startsWith('00237')) digits = digits.slice(5);
    else if (digits.length === 12 && digits.startsWith('237')) digits = digits.slice(3);
    return digits;
}

/** Returns 'MTN' | 'ORANGE' | null for a normalised number. */
function detectOperator(phone) {
    return SERVICES.find(s => OPERATOR_PATTERNS[s].test(phone)) || null;
}

/**
 * Validate a service/payer pair.
 * @returns {{ ok: true, service: string, payer: string } | { ok: false, error: string }}
 */
function validatePayer(service, rawPayer) {
    if (!SERVICES.includes(service)) {
        return { ok: false, error: 'Payment service must be MTN or ORANGE' };
    }

    const payer = normalizePhone(rawPayer);
    if (payer.length !== 9) {
        return { ok: false, error: 'Enter a valid 9-digit Cameroon phone number (e.g. 677000000)' };
    }

    const operator = detectOperator(payer);
    if (!operator) {
        return { ok: false, error: 'This number is not a valid MTN or Orange Cameroon number' };
    }
    if (operator !== service) {
        const label = { MTN: 'MTN MoMo', ORANGE: 'Orange Money' };
        return { ok: false, error: `${payer} is a ${label[operator]} number. Select ${label[operator]} to continue.` };
    }

    return { ok: true, service, payer };
}

/**
 * Send the USSD push. Asynchronous mode: resolves as soon as the operator
 * accepts the request, long before the payer enters their PIN.
 * @returns {Promise<string|null>} the MeSomb transaction reference (pk)
 */
async function initiateCollect({ amount, service, payer, description, externalId }) {
    const response = await getPaymentClient().makeCollect({
        amount,
        service,
        payer,
        country: 'CM',
        currency: 'XAF',
        mode: 'asynchronous',
        nonce: RandomGenerator.nonce(),
        ...(externalId != null && { trxID: String(externalId) }),
        ...(description && { extra: { description } }),
    });

    if (!response.isOperationSuccess()) {
        throw new Error('Provider rejected the payment request');
    }
    return response.transaction?.pk || null;
}

/**
 * Poll a transaction. Unknown/not-yet-visible references stay PENDING so the
 * caller keeps polling rather than failing a payment that is still in flight.
 * @returns {Promise<'PENDING'|'SUCCESS'|'FAILED'>}
 */
async function checkStatus(reference) {
    const result = await getPaymentClient().checkTransactions([reference]);
    const found = Array.isArray(result) ? result[0] : result;
    const status = String(found?.status || found?.data?.status || 'PENDING').toUpperCase();

    if (status === 'SUCCESS') return 'SUCCESS';
    if (['FAILED', 'REVERSED', 'CANCELED', 'CANCELLED', 'EXPIRED'].includes(status)) return 'FAILED';
    return 'PENDING';
}

module.exports = { SERVICES, normalizePhone, detectOperator, validatePayer, initiateCollect, checkStatus };
