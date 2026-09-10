/** Reads the deployed server's payment-credential fingerprints. */
require('dotenv').config();
const https = require('https');
const jwt = require('jsonwebtoken');

const HOST = 'studyhubwebapp-1.onrender.com';
const token = jwt.sign({ userId: 1, email: 'stanleytazanu262@gmail.com' }, process.env.JWT_SECRET, { expiresIn: '20m' });

function get(path, tries = 8) {
    return new Promise((resolve, reject) => {
        const attempt = n => {
            const r = https.request({ host: HOST, path, method: 'GET', timeout: 120000,
                headers: { Authorization: `Bearer ${token}` } }, res => {
                let d = ''; res.on('data', c => d += c);
                res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
                    catch { resolve({ status: res.statusCode, data: { _raw: d.slice(0, 200) } }); } });
            });
            r.on('timeout', () => { r.destroy(); n < tries ? setTimeout(() => attempt(n + 1), 4000) : reject(new Error('timeout')); });
            r.on('error', () => { n < tries ? setTimeout(() => attempt(n + 1), 4000) : reject(new Error('connect failed')); });
            r.end();
        };
        attempt(1);
    });
}

const LOCAL = {
    MESOMB_APPLICATION_KEY: { length: 40, sha256_8: '21d119ae' },
    MESOMB_ACCESS_KEY:      { length: 36, sha256_8: 'fdce5e16' },
    MESOMB_SECRET_KEY:      { length: 36, sha256_8: '7b458d23' },
};

(async () => {
    for (let round = 1; round <= 15; round++) {
        const r = await get('/api/admin/payments/diagnostics');
        if (r.status === 404) { console.log(`  [${round}] endpoint not deployed yet…`); await new Promise(s => setTimeout(s, 20000)); continue; }
        if (r.status !== 200) { console.log(`  [${round}] HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 120)}`); await new Promise(s => setTimeout(s, 20000)); continue; }

        const d = r.data;
        console.log(`\n  NODE_ENV: ${d.nodeEnv}   server time: ${d.serverTime}`);
        console.log('\n  key                       len  head    tail   ws     digest    vs local');
        for (const k of d.keys) {
            if (!k.present) { console.log(`  ${k.name.padEnd(24)} MISSING`); continue; }
            const exp = LOCAL[k.name];
            const match = exp && k.sha256_8 === exp.sha256_8;
            console.log(
                `  ${k.name.padEnd(24)} ${String(k.length).padStart(3)}  ${k.head}  ${k.tail}  ` +
                `${String(k.hasWhitespace).padEnd(5)}  ${k.sha256_8}  ${match ? 'MATCH' : 'DIFFERENT (local ' + (exp?.sha256_8 ?? '?') + ', len ' + (exp?.length ?? '?') + ')'}`
            );
            if (k.hasQuotes) console.log(`      ^ value is wrapped in quotes`);
        }
        console.log('\n  live getStatus:', JSON.stringify(d.live));
        return;
    }
    console.log('  gave up waiting for the deploy');
})().catch(e => console.log('  FAILED:', e.message));
