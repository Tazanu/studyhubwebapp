require('dotenv').config();
const https = require('https');
const jwt = require('jsonwebtoken');

const HOST = 'studyhubwebapp-1.onrender.com';
const token = jwt.sign({ userId: 1, email: 'stanleytazanu262@gmail.com' }, process.env.JWT_SECRET, { expiresIn: '25m' });

function req(method, path, body, tries = 8) {
    return new Promise((resolve, reject) => {
        const go = n => {
            const payload = body ? JSON.stringify(body) : null;
            const r = https.request({ host: HOST, path: '/api' + path, method, timeout: 120000,
                headers: { Authorization: `Bearer ${token}`,
                    ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}) } },
                res => { let d = ''; res.on('data', c => d += c);
                    res.on('end', () => { let j; try { j = JSON.parse(d); } catch { j = { _raw: d.slice(0, 150) }; }
                        resolve({ status: res.statusCode, data: j }); }); });
            r.on('timeout', () => { r.destroy(); n < tries ? setTimeout(() => go(n + 1), 5000) : reject(new Error('timeout')); });
            r.on('error', () => { n < tries ? setTimeout(() => go(n + 1), 5000) : reject(new Error('failed')); });
            if (payload) r.write(payload);
            r.end();
        };
        go(1);
    });
}

// Written to describe what is on offer without claiming credentials I cannot
// verify — no invented years of experience or qualifications.
const BIO = [
    'I built StudyHub, and I tutor in information technology, computer science and mathematics.',
    'I work through coursework, past papers and practical projects — bring the problem you are stuck on',
    'and we will work it out together rather than me lecturing at you.',
    'Message me with your course and what you need before booking, so the session is useful from minute one.',
].join(' ');

(async () => {
    // wait for the fixed build
    for (let i = 1; i <= 20; i++) {
        const probe = await req('POST', '/tutors', { bio: 'x', subjects: [], hourlyRate: 1 });
        if (probe.status === 400) break;            // validation reached = new build
        console.log(`  [${i}] waiting for deploy (got ${probe.status})…`);
        await new Promise(s => setTimeout(s, 20000));
    }

    let r = await req('POST', '/tutors', {
        bio: BIO,
        subjects: ['Information Technology', 'Computer Science', 'Mathematics'],
        hourlyRate: 1000,
        yearsExperience: '1-2',
    });
    console.log('  create tutor profile:', r.status, r.data.message || r.data.error || '');
    let tutorId = r.data.tutor?.id;

    if (r.status === 400 && /already registered/i.test(r.data.error || '')) {
        const me = await req('GET', '/tutors/status/me');
        tutorId = me.data?.id ?? me.data?.tutor?.id;
        console.log('  already existed, id', tutorId);
    }
    if (!tutorId) { console.log('  could not determine tutor id:', JSON.stringify(r.data).slice(0, 200)); return; }

    r = await req('PATCH', `/admin/tutors/${tutorId}/status`, { status: 'approved' });
    console.log('  approve:', r.status, r.data.error || 'approved');

    // Self-publishing trust, so notes go live without waiting on the one admin
    // who would otherwise have to review their own submissions.
    r = await req('PATCH', `/admin/tutors/${tutorId}/trust`, { exempt: true });
    console.log('  publishing trust:', r.status, r.data.trust?.reason || r.data.error || '');

    r = await req('GET', '/tutors/status/me');
    console.log('\n  status/me:', JSON.stringify(r.data).slice(0, 220));

    r = await req('GET', '/tutors');
    const listed = (r.data?.tutors ?? r.data ?? []).find(t => t.id === tutorId);
    console.log('  appears in public tutor listing:', listed ? 'YES' : 'NO');
    if (listed) console.log('   ', JSON.stringify({ id: listed.id, name: listed.name, subjects: listed.subjects, rate: listed.hourly_rate ?? listed.rate }).slice(0, 200));
})().catch(e => console.log('  FAILED:', e.message));
