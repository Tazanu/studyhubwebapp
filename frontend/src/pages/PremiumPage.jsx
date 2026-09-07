import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Crown, Lock, Unlock, Upload, Loader2, Star, AlertCircle, FileText, Image as ImageIcon, File, Download } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Modal from '../components/ui/Modal';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import { cn } from '../lib/cn';

const cardVariant = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

const API_ORIGIN = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

/**
 * Premium files are served only through an entitlement-checked route, which
 * needs the auth header — so fetch the bytes and hand the browser a blob rather
 * than linking straight at a storage URL.
 */
async function openPremiumNote(noteId) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_ORIGIN}/api/premium/notes/${noteId}/file`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            toast.error(body.error || 'Could not open this note');
            return;
        }
        const url = URL.createObjectURL(await res.blob());
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
        toast.error('Could not open this note');
    }
}

function getFileIcon(t) {
    const type = (t || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) return ImageIcon;
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(type)) return FileText;
    return File;
}

// Cameroon prefixes, mirrored from the server so the operator always matches
// the number the user typed.
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

// ── Payment Modal ─────────────────────────────────────────────────────────────
function PayModal({ open, title, amount, onConfirm, onClose, loading, waitingPhone }) {
    const [service, setService] = useState('MTN');
    const [payer, setPayer] = useState('');

    const cleaned = normalizePhone(payer);
    const detected = detectOperator(cleaned);

    // Keep the selected operator in sync with the number.
    useEffect(() => {
        if (detected && detected !== service) setService(detected);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detected]);

    const submit = (e) => {
        e.preventDefault();
        if (cleaned.length !== 9) return toast.error('Enter a valid 9-digit number, e.g. 677000000');
        if (!detected) return toast.error('This is not a valid MTN or Orange Cameroon number');
        onConfirm({ service: detected, payer: cleaned });
    };

    return (
        <Modal open={open} onClose={onClose} closeOnBackdrop={!loading} closeOnEscape={!loading} title={title} size="sm">
            {waitingPhone ? (
                <div className="text-center py-6">
                    <Loader2 size={40} className="animate-spin mx-auto mb-4 text-premium" />
                    <p className="font-semibold mb-1">Check your phone!</p>
                    <p className="text-sm text-fg-secondary">
                        A USSD prompt has been sent to your phone.<br />Approve the payment to continue.
                    </p>
                    <p className="text-xs mt-4 text-fg-muted">Waiting for confirmation… Keep this window open.</p>
                </div>
            ) : (
                <>
                    <p className="text-sm mb-5 text-fg-secondary">
                        Amount: <span className="font-bold text-base text-fg">{amount.toLocaleString()} FCFA</span>
                    </p>
                    <form onSubmit={submit}>
                        <Field label="Mobile Money Service">
                            <div className="flex gap-3">
                                {['MTN', 'ORANGE'].map(s => (
                                    <button key={s} type="button" onClick={() => setService(s)}
                                        className={cn(
                                            'flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                                            service === s ? 'border-premium bg-premium-bg text-premium' : 'border-border bg-surface-hover text-fg-secondary',
                                        )}>{s}</button>
                                ))}
                            </div>
                        </Field>
                        <Field label="Phone Number">
                            <Input type="tel" inputMode="numeric" value={payer} onChange={e => setPayer(e.target.value)} placeholder="e.g. 677000000" />
                            {cleaned.length === 9 && !detected && (
                                <p className="text-xs mt-1.5 text-danger">Not a valid MTN or Orange Cameroon number.</p>
                            )}
                        </Field>
                        <Button type="submit" disabled={loading} loading={loading} fullWidth className="!bg-[image:linear-gradient(135deg,#d97706,#fbbf24)]">
                            {loading ? 'Sending…' : `Pay ${amount.toLocaleString()} FCFA`}
                        </Button>
                    </form>
                </>
            )}
        </Modal>
    );
}

// ── Receipt Modal ─────────────────────────────────────────────────────────────
function ReceiptModal({ receipt, onClose }) {
    const printReceipt = () => {
        const w = window.open('', '_blank', 'width=600,height=700');
        w.document.write(`<!DOCTYPE html><html><head><title>Receipt ${receipt.receiptNo}</title>
<style>
body{font-family:Arial,sans-serif;padding:40px;color:#111;max-width:520px;margin:0 auto}
.logo{font-size:22px;font-weight:800;color:#d97706;margin-bottom:4px}
.sub{font-size:12px;color:#666;margin-bottom:28px}
h2{font-size:18px;margin:0 0 20px;border-bottom:2px solid #fbbf24;padding-bottom:10px}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:13px}
.label{color:#666}.value{font-weight:600;text-align:right;max-width:60%}
.total{display:flex;justify-content:space-between;padding:14px 0;font-size:16px;font-weight:800;color:#d97706}
.badge{display:inline-block;background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700}
.footer{margin-top:28px;font-size:11px;color:#999;text-align:center}
</style></head><body>
<div class="logo">&#128081; StudyHub</div>
<div class="sub">Payment Receipt</div>
<h2>Receipt #${receipt.receiptNo}</h2>
<div class="row"><span class="label">Date</span><span class="value">${new Date(receipt.date).toLocaleString()}</span></div>
<div class="row"><span class="label">Name</span><span class="value">${receipt.name}</span></div>
<div class="row"><span class="label">Email</span><span class="value">${receipt.email}</span></div>
<div class="row"><span class="label">Description</span><span class="value">${receipt.description}</span></div>
<div class="row"><span class="label">Payment Type</span><span class="value">${receipt.type === 'subscription' ? 'Monthly Subscription' : 'Note Purchase'}</span></div>
<div class="row"><span class="label">MeSomb Reference</span><span class="value">${receipt.reference || 'N/A'}</span></div>
<div class="row"><span class="label">Status</span><span class="value"><span class="badge">&#10003; Completed</span></span></div>
<div class="total"><span>Total Paid</span><span>${receipt.amount.toLocaleString()} FCFA</span></div>
<div class="footer">Thank you for using StudyHub. This is an official payment receipt.<br/>Keep this for your records.</div>
</body></html>`);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 300);
    };

    return (
        <Modal open={!!receipt} onClose={onClose} title="Payment Receipt" size="sm">
            {receipt && (
                <>
                    <div className="text-center mb-5">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 bg-success-bg">
                            <span className="text-3xl">✓</span>
                        </div>
                        <p className="font-bold text-lg text-success">Payment Successful</p>
                        <p className="text-xs mt-1 text-fg-secondary">Receipt #{receipt.receiptNo}</p>
                    </div>

                    <div className="rounded-xl p-4 mb-5 space-y-2.5 bg-surface-hover">
                        {[
                            ['Date', new Date(receipt.date).toLocaleString()],
                            ['Name', receipt.name],
                            ['Description', receipt.description],
                            ['Type', receipt.type === 'subscription' ? 'Monthly Subscription' : 'Note Purchase'],
                            ['Reference', receipt.reference || 'N/A'],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between text-sm">
                                <span className="text-fg-secondary">{label}</span>
                                <span className="font-medium text-right ml-4" style={{ maxWidth: '60%', wordBreak: 'break-all' }}>{value}</span>
                            </div>
                        ))}
                        <div className="flex justify-between text-base font-bold pt-2 border-t border-border text-premium">
                            <span>Total Paid</span>
                            <span>{receipt.amount.toLocaleString()} FCFA</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button onClick={onClose} variant="secondary" fullWidth>Close</Button>
                        <Button onClick={printReceipt} icon={Download} fullWidth className="!bg-[image:linear-gradient(135deg,#059669,#34d399)]">
                            Download PDF
                        </Button>
                    </div>
                </>
            )}
        </Modal>
    );
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ open, onClose, onUploaded }) {
    const [form, setForm] = useState({ title: '', description: '', subject: '', price: '', tags: '' });
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState({});
    const fileRef = useRef(null);

    const submit = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!form.title) errs.title = 'Required';
        if (!form.description) errs.description = 'Required';
        if (!form.subject) errs.subject = 'Required';
        if (!form.price || parseFloat(form.price) <= 0) errs.price = 'Enter a valid price';
        if (!file) errs.file = 'Select a file';
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setUploading(true);
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append('file', file);
        try {
            await api.post('/premium/notes', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            onUploaded();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Upload failed');
            setUploading(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={uploading ? () => {} : onClose}
            closeOnBackdrop={!uploading}
            closeOnEscape={!uploading}
            title="Post Premium Note"
            size="lg"
            footer={
                <>
                    <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={uploading}>Cancel</Button>
                    <Button type="submit" form="premium-upload-form" size="sm" loading={uploading} icon={uploading ? undefined : Upload} className="!bg-[image:linear-gradient(135deg,#d97706,#fbbf24)]">
                        {uploading ? 'Uploading…' : 'Post Note'}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} id="premium-upload-form">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Title" required error={errors.title}>
                        <Input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} invalid={!!errors.title} />
                    </Field>
                    <Field label="Subject" required error={errors.subject}>
                        <Input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} invalid={!!errors.subject} />
                    </Field>
                </div>
                <Field label="Description" required error={errors.description}>
                    <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} invalid={!!errors.description} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Price (FCFA)" required error={errors.price}>
                        <Input type="number" min="1" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="500" invalid={!!errors.price} />
                    </Field>
                    <Field label="Tags" hint="comma-sep">
                        <Input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="math, calculus" />
                    </Field>
                </div>
                <Field label="File" required className="mb-0">
                    <div onClick={() => fileRef.current?.click()}
                        className={cn(
                            'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all bg-surface-hover',
                            errors.file ? 'border-danger' : 'border-border',
                        )}>
                        <input ref={fileRef} type="file" className="hidden"
                            accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp"
                            onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
                        <Upload size={28} className="mx-auto mb-2 text-premium" />
                        {file ? (
                            <p className="font-semibold text-sm">{file.name} <span className="font-normal text-xs text-fg-secondary">({(file.size / 1024 / 1024).toFixed(2)} MB)</span></p>
                        ) : (
                            <p className="text-sm text-fg-secondary">Click to select file (PDF, DOC, images, max 20MB)</p>
                        )}
                    </div>
                    {errors.file && <p className="text-xs mt-1 flex items-center gap-1 text-danger"><AlertCircle size={12} />{errors.file}</p>}
                </Field>
            </form>
        </Modal>
    );
}

// ── Note Card ─────────────────────────────────────────────────────────────────
function NoteCard({ note, onPurchase, isAdmin }) {
    const FileIcon = getFileIcon(note.file_type);
    const owned = note.purchased;

    return (
        <motion.div variants={cardVariant}
            className="rounded-2xl p-5 border border-premium/25 bg-surface flex flex-col relative overflow-hidden">
            {/* crown badge */}
            <Badge tone="premium" size="sm" icon={Crown} className="absolute top-3 right-3">PREMIUM</Badge>

            <div className="flex items-start gap-3 mb-3 pr-20">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-premium-bg">
                    <FileIcon size={20} className="text-premium" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-snug truncate">{note.title}</h3>
                    <Badge tone="premium" size="sm" className="mt-1">{note.subject}</Badge>
                </div>
            </div>

            <p className="text-xs mb-4 flex-1 line-clamp-2 text-fg-secondary" style={{ lineHeight: 1.7 }}>
                {note.description}
            </p>

            <div className="flex justify-between text-xs mb-4 text-fg-secondary">
                <span className="flex items-center gap-1"><Download size={12} /> {note.downloads || 0}</span>
                <span>by {note.users?.first_name} {note.users?.last_name}</span>
            </div>

            <div className="flex items-center justify-between">
                <span className="text-base font-bold text-premium">
                    {Number(note.price).toLocaleString()} FCFA
                </span>
                {owned || isAdmin ? (
                    <Button onClick={() => openPremiumNote(note.id)} icon={Unlock} size="sm" className="!bg-[image:linear-gradient(135deg,#059669,#34d399)]">
                        Download
                    </Button>
                ) : (
                    <Button onClick={() => onPurchase(note)} icon={Lock} size="sm" className="!bg-[image:linear-gradient(135deg,#d97706,#fbbf24)]">
                        Buy
                    </Button>
                )}
            </div>
        </motion.div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PremiumPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const canPublish = isAdmin || user?.tutor_status === 'approved';

    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState({ active: false, expires_at: null });
    const [subLoading, setSubLoading] = useState(true);

    const [showUpload, setShowUpload] = useState(false);
    const [payTarget, setPayTarget] = useState(null);
    const [paying, setPaying] = useState(false);
    const [waitingPhone, setWaitingPhone] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const pollRef = useRef(null);

    const loadNotes = async () => {
        try {
            const { data } = await api.get('/premium/notes');
            setNotes(data);
        } catch { toast.error('Failed to load premium notes'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadNotes(); setSubLoading(false); }, []);

    const canPost = canPublish;

    const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

    const handlePay = async ({ service, payer }) => {
        setPaying(true);
        try {
            const body = {
                service,
                payer,
                type: payTarget.type === 'subscribe' ? 'subscription' : 'note_purchase',
                ...(payTarget.type === 'note' && { noteId: payTarget.note.id }),
            };
            const { data } = await api.post('/premium/pay/initiate', body);
            if (!data.success) { toast.error(data.error || 'Failed to initiate payment'); setPaying(false); return; }

            const { txId } = data;
            setWaitingPhone(true);

            // Poll every 3s. The window matches the server-side payment TTL —
            // 60s was cutting off payments the payer was still approving.
            const deadline = Date.now() + 3 * 60_000;
            let inFlight = false;
            pollRef.current = setInterval(async () => {
                if (inFlight) return; // don't stack requests if one poll is slow
                inFlight = true;
                try {
                    const { data: poll } = await api.get(`/premium/pay/status/${txId}`);

                    if (poll.status === 'completed') {
                        stopPolling();
                        setWaitingPhone(false);
                        setPaying(false);
                        const currentTarget = payTarget;
                        setPayTarget(null);
                        if (poll.type === 'subscription') {
                            toast.success('Subscription activated!');
                            setSubscription({ active: true, expires_at: poll.subscription?.expires_at });
                        } else {
                            toast.success('Purchase successful!');
                            setNotes(prev => prev.map(n => n.id === currentTarget.note.id ? { ...n, purchased: true } : n));
                            if (poll.noteId) openPremiumNote(poll.noteId);
                        }
                        try {
                            const token = localStorage.getItem('token');
                            const res = await fetch(`${API_ORIGIN}/api/premium/pay/receipt/${txId}`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            if (res.ok) setReceipt(await res.json());
                        } catch { /* receipt is optional */ }
                    } else if (poll.status === 'failed') {
                        stopPolling();
                        setWaitingPhone(false);
                        setPaying(false);
                        toast.error(poll.error || 'Payment declined. Please try again.');
                    } else if (poll.status === 'processing' || Date.now() > deadline) {
                        // The charge may still land — the server settles it in
                        // the background, so don't report a failure.
                        stopPolling();
                        setWaitingPhone(false);
                        setPaying(false);
                        setPayTarget(null);
                        toast.info(
                            'Still confirming with the operator. If you approved the payment, your access unlocks automatically in a few minutes — do not pay again.',
                            { duration: 8000 },
                        );
                    }
                } catch { /* keep polling on network hiccup */ }
                finally { inFlight = false; }
            }, 3000);
        } catch (err) {
            setPaying(false);
            toast.error(err.response?.data?.error || 'Payment failed. Please try again.');
        }
    };

    return (
        <div className="lg:pl-60 min-h-screen bg-bg text-fg">
            <Sidebar />

            {/* HERO */}
            <section className="pt-20 px-6 py-12 text-center border-b border-premium/20 bg-premium-bg">
                <Badge tone="premium" size="md" icon={Crown} className="mb-4">Premium Notes</Badge>
                <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                    Exclusive Study Materials
                </h1>
                <p className="max-w-xl mx-auto text-sm mb-8 text-fg-secondary">
                    High-quality notes curated by top students and tutors. Purchase individual notes or become a premium publisher.
                </p>

                {canPublish && (
                    <Badge tone="success" size="md" icon={Star} className="mx-auto mb-2 w-fit">Premium Publisher</Badge>
                )}

                {/* Stats */}
                <div className="flex justify-center gap-12 flex-wrap mt-6">
                    {[[notes.length, 'Premium Notes'], [notes.reduce((s, n) => s + (n.downloads || 0), 0), 'Downloads']].map(([v, l]) => (
                        <div key={l} className="text-center">
                            <div className="text-3xl font-bold tabular-nums text-premium" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{v}</div>
                            <div className="text-xs mt-0.5 text-fg-secondary">{l}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* TOOLBAR */}
            <div className="sticky top-16 z-30 px-4 sm:px-6 py-3 border-b border-border bg-surface flex justify-end items-center gap-3">
                {canPublish && (
                    <Button onClick={() => setShowUpload(true)} icon={Upload} className="!bg-[image:linear-gradient(135deg,#d97706,#fbbf24)]">
                        Post Premium Note
                    </Button>
                )}
            </div>

            {/* GRID */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="rounded-2xl p-6 border border-border bg-surface">
                                <Skeleton className="h-4 w-3/4 mb-3" />
                                <Skeleton className="h-3 w-full mb-2" />
                                <Skeleton className="h-8 mt-4" />
                            </div>
                        ))}
                    </div>
                ) : notes.length === 0 ? (
                    <EmptyState
                        icon={Crown}
                        title="No premium notes yet"
                        description={canPost ? 'Be the first to post a premium note!' : 'Check back soon.'}
                        action={canPost && <Button onClick={() => setShowUpload(true)} className="!bg-[image:linear-gradient(135deg,#d97706,#fbbf24)]">Post First Note</Button>}
                    />
                ) : (
                    <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                        variants={stagger} initial="hidden" animate="show">
                        {notes.map(note => (
                            <NoteCard key={note.id} note={note} isAdmin={isAdmin}
                                onPurchase={n => setPayTarget({ type: 'note', note: n })} />
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Modals */}
            <UploadModal
                open={showUpload}
                onClose={() => setShowUpload(false)}
                onUploaded={() => { setShowUpload(false); loadNotes(); toast.success('Premium note posted!'); }}
            />
            <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
            <PayModal
                open={!!payTarget}
                title={payTarget?.type === 'subscribe' ? 'Subscribe as Publisher' : `Buy: ${payTarget?.note?.title}`}
                amount={payTarget?.type === 'subscribe' ? 1000 : Number(payTarget?.note?.price || 0)}
                onConfirm={handlePay}
                onClose={() => { if (!paying) { stopPolling(); setWaitingPhone(false); setPayTarget(null); } }}
                loading={paying}
                waitingPhone={waitingPhone}
            />
        </div>
    );
}
