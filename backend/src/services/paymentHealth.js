const { getPaymentClient } = require('../mesomb');

/**
 * Verify the payment credentials at startup.
 *
 * Bad MeSomb keys fail in the worst possible way: the app boots, the UI works,
 * and payments fail only at the moment someone tries to buy something — with a
 * "Bad signature" that never surfaces past a 502. This turns that into one
 * obvious line in the deploy log.
 *
 * Read-only: getStatus() moves no money and sends no prompt.
 */
async function checkPaymentCredentials() {
    const keys = ['MESOMB_APPLICATION_KEY', 'MESOMB_ACCESS_KEY', 'MESOMB_SECRET_KEY'];
    const missing = keys.filter(k => !process.env[k]);

    if (missing.length) {
        console.error(`\n*** PAYMENTS DISABLED *** missing ${missing.join(', ')} — purchases will fail.\n`);
        return { ok: false, reason: 'missing keys' };
    }

    // Whitespace survives a copy-paste into a dashboard field and breaks the
    // signature with no other symptom, so name it specifically.
    const padded = keys.filter(k => process.env[k] !== process.env[k].trim());
    if (padded.length) {
        console.error(`\n*** PAYMENT KEYS HAVE LEADING/TRAILING WHITESPACE: ${padded.join(', ')} — this breaks request signing.\n`);
    }

    try {
        const status = await getPaymentClient().getStatus();
        const providers = (status?.balances || []).map(b => b.provider);
        console.log(`[payments] credentials OK — application "${status?.name}", providers: ${providers.join(', ') || 'none'}`);
        if (!providers.length) {
            console.warn('[payments] no operator is provisioned on this application; every collect will fail.');
        }
        return { ok: true, providers, application: status?.name };
    } catch (err) {
        console.error(
            '\n*** PAYMENT CREDENTIALS REJECTED BY MESOMB ***\n' +
            `  ${err?.name || 'Error'}: ${(err?.message || '').split('\n')[0]}\n` +
            '  Purchases will fail with "Bad signature" until this is fixed.\n' +
            '  Check MESOMB_ACCESS_KEY / MESOMB_SECRET_KEY / MESOMB_APPLICATION_KEY\n' +
            '  match the values in the MeSomb dashboard exactly, with no stray\n' +
            '  whitespace or truncation.\n'
        );
        return { ok: false, reason: err?.message };
    }
}

module.exports = { checkPaymentCredentials };
