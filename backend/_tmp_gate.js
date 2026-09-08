require('dotenv').config();
const jwt = require('jsonwebtoken');
const API = 'https://studyhubwebapp-1.onrender.com/api';
const admin = jwt.sign({ userId: 1, email: 'a' }, process.env.JWT_SECRET, { expiresIn: '30m' });

const R = [];
const check = (n, p, d = '') => { R.push(p); console.log(`${(p ? 'PASS' : 'FAIL').padEnd(5)} ${n.padEnd(48)} ${d}`); };

const upload = async (token, { title, description, body, type = 'text/plain', name = 'n.txt', price = 100 }) => {
    const fd = new FormData();
    fd.append('title', title); fd.append('description', description);
    fd.append('subject', 'Computer Science'); fd.append('price', String(price));
    fd.append('file', new Blob([body], { type }), name);
    const res = await fetch(API + '/premium/notes', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
        signal: AbortSignal.timeout(120000),
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
};
const call = async (p, { method = 'GET', token, body } = {}) => {
    const res = await fetch(API + p, {
        method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000),
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
};

// A real generated study PDF — genuine, varied content.
const fs = require('fs');
const GOOD = fs.readFileSync('C:/Users/donal/AppData/Local/Temp/claude/c--Users-donal-studyhub-v2-frontend/16fa7e5e-f673-49d7-b9c0-a0fb2d9a0403/scratchpad/seed/pdf/note2.pdf');

(async () => {
    console.log('──── automated rejection ────');
    let r = await upload(admin, { title: 'Complete Physics Revision Guide',
        description: 'Everything you need to pass the exam this semester, fully explained with examples.', body: 'Study hard.\nGood luck.' });
    check('near-empty file rejected', r.status === 422, `${r.status} ${JSON.stringify(r.data.reasons || []).slice(0, 70)}`);

    r = await upload(admin, { title: 'Advanced Thermodynamics Notes',
        description: 'Comprehensive coverage of the laws of thermodynamics with worked examples throughout.',
        body: 'Lorem ipsum dolor sit amet consectetur adipiscing elit. '.repeat(80) });
    check('placeholder text rejected', r.status === 422, `${r.status}`);

    r = await upload(admin, { title: 'Cell Biology Complete Notes',
        description: 'A thorough treatment of cell structure, organelles and their biological functions.',
        body: 'The mitochondria is the powerhouse of the cell and produces energy. '.repeat(90) });
    check('repetitive padding rejected', r.status === 422, `${r.status}`);

    r = await upload(admin, { title: 'Notes', description: 'good notes', body: GOOD, type: 'application/pdf', name: 'n.pdf' });
    check('thin title/description rejected', r.status === 422, `${r.status}`);

    console.log('\n──── accepted, but held for review ────');
    r = await upload(admin, { title: 'Graph Traversal and Spanning Structures',
        description: 'A study of weighted graph traversal, edge ordering and the spanning structures that result from each approach.',
        body: GOOD, type: 'application/pdf', name: 'graph-traversal.pdf' });
    check('genuine content accepted', r.status === 201, `${r.status} ${r.data.message || r.data.error || ''}`);
    const id = r.data.note?.id;
    check('created as pending, not live', r.data.note?.review_status === 'pending', `status=${r.data.note?.review_status}`);

    // a buyer's view
    const buyer = (await call('/auth/register', { method: 'POST', body: {
        email: `gate.${Date.now()}@studyhub.test`, password: 'TestPass123!', firstName: 'Gate', lastName: 'Test' } })).data.token;

    r = await call('/premium/notes', { token: buyer });
    const visible = (r.data || []).some(n => n.id === id);
    check('pending note hidden from buyers', !visible, `${(r.data || []).length} notes visible`);

    r = await call('/premium/notes', { token: admin });
    check('admin still sees it', (r.data || []).some(n => n.id === id), '');

    const f = await fetch(`${API}/premium/notes/${id}/file`, { headers: { Authorization: `Bearer ${buyer}` } });
    check('buyer cannot download pending note', f.status === 404, `${f.status}`);

    r = await call('/premium/pay/initiate', { method: 'POST', token: buyer, body: {
        service: 'MTN', payer: '677000000', type: 'note_purchase', noteId: id } });
    check('cannot pay for a pending note', r.status === 409, `${r.status} ${r.data.error || ''}`);

    console.log('\n──── review ────');
    r = await call('/admin/premium/notes/pending', { token: admin });
    check('note appears in review queue', (r.data || []).some(n => n.id === id), `queue=${(r.data || []).length}`);

    r = await call(`/admin/premium/notes/${id}/review`, { method: 'PATCH', token: admin, body: { status: 'rejected' } });
    check('rejection requires a reason', r.status === 400, `${r.status}`);

    r = await call(`/admin/premium/notes/${id}/review`, { method: 'PATCH', token: admin, body: { status: 'approved' } });
    check('admin approves', r.status === 200 && r.data.note?.review_status === 'approved', `${r.status}`);

    r = await call('/premium/notes', { token: buyer });
    check('approved note now visible to buyers', (r.data || []).some(n => n.id === id), '');

    r = await call('/premium/pay/initiate', { method: 'POST', token: buyer, body: {
        service: 'MTN', payer: '677000000', type: 'note_purchase', noteId: id } });
    check('now purchasable (reaches provider)', r.status !== 409, `${r.status} ${r.data.error || 'accepted'}`);

    console.log(`\n════ ${R.filter(Boolean).length}/${R.length} passed ════`);
    console.log('cleanup id:', id);
})();
