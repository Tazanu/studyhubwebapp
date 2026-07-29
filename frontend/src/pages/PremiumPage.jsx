import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Lock, Unlock, Upload, X, Loader2, Star, AlertCircle, FileText, Image as ImageIcon, File, Download, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

const cardVariant = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

const API_ORIGIN = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function getFileIcon(t) {
    const type = (t || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) return ImageIcon;
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(type)) return FileText;
    return File;
}

// ── Payment Modal ─────────────────────────────────────────────────────────────
function PayModal({ title, amount, onConfirm, onClose, loading, waitingPhone }) {
    const [service, setService] = useState('MTN');
    const [payer, setPayer] = useState('');

    const submit = (e) => {
        e.preventDefault();
        if (!payer.trim()) return toast.error('Enter your phone number');
        onConfirm({ service, payer: payer.trim() });
    };

    return (
        <>
            <motion.div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={loading ? undefined : onClose} />
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
                initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
                <div className="w-full max-w-md rounded-2xl border p-8 pointer-events-auto"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: '#fbbf24' }}>
                            <Crown size={18} className="inline mr-2" />{title}
                        </h2>
                        <button onClick={onClose} disabled={loading} className="p-1.5 rounded-lg hover:bg-red-500 hover:text-white"
                            style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
                    </div>

                    {waitingPhone ? (
                        <div className="text-center py-6">
                            <Loader2 size={40} className="animate-spin mx-auto mb-4" style={{ color: '#fbbf24' }} />
                            <p className="font-semibold mb-1">Check your phone!</p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                A USSD prompt has been sent to your phone.<br />Approve the payment to continue.
                            </p>
                            <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>Waiting for confirmation… (up to 60s)</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                                Amount: <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{amount.toLocaleString()} FCFA</span>
                            </p>
                            <form onSubmit={submit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold mb-1.5">Mobile Money Service</label>
                                    <div className="flex gap-3">
                                        {['MTN', 'ORANGE'].map(s => (
                                            <button key={s} type="button" onClick={() => setService(s)}
                                                className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all"
                                                style={{
                                                    borderColor: service === s ? '#fbbf24' : 'var(--border-subtle)',
                                                    background: service === s ? 'rgba(251,191,36,0.12)' : 'var(--bg-hover)',
                                                    color: service === s ? '#fbbf24' : 'var(--text-secondary)',
                                                }}>{s}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold mb-1.5">Phone Number</label>
                                    <input type="tel" value={payer} onChange={e => setPayer(e.target.value)}
                                        placeholder="e.g. 677000000" className="form-input px-4" />
                                </div>
                                <button type="submit" disabled={loading}
                                    className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                                    style={{ background: 'linear-gradient(135deg,#d97706,#fbbf24)' }}>
                                    {loading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : `Pay ${amount.toLocaleString()} FCFA`}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </motion.div>
        </>
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
        <>
            <motion.div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose} />
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
                initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
                <div className="w-full max-w-md rounded-2xl border p-8 pointer-events-auto"
                    style={{ background: 'var(--bg-card)', border: '1px solid rgba(52,211,153,0.3)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#34d399' }}>
                            <Receipt size={18} /> Payment Receipt
                        </h2>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-500 hover:text-white"
                            style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
                    </div>

                    <div className="text-center mb-5">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                            style={{ background: 'rgba(52,211,153,0.15)' }}>
                            <span className="text-3xl">✓</span>
                        </div>
                        <p className="font-bold text-lg" style={{ color: '#34d399' }}>Payment Successful</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Receipt #{receipt.receiptNo}</p>
                    </div>

                    <div className="rounded-xl p-4 mb-5 space-y-2.5" style={{ background: 'var(--bg-hover)' }}>
                        {[
                            ['Date', new Date(receipt.date).toLocaleString()],
                            ['Name', receipt.name],
                            ['Description', receipt.description],
                            ['Type', receipt.type === 'subscription' ? 'Monthly Subscription' : 'Note Purchase'],
                            ['Reference', receipt.reference || 'N/A'],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between text-sm">
                                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                                <span className="font-medium text-right ml-4" style={{ maxWidth: '60%', wordBreak: 'break-all' }}>{value}</span>
                            </div>
                        ))}
                        <div className="flex justify-between text-base font-bold pt-2 border-t" style={{ borderColor: 'var(--border-subtle)', color: '#fbbf24' }}>
                            <span>Total Paid</span>
                            <span>{receipt.amount.toLocaleString()} FCFA</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium"
                            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>Close</button>
                        <button onClick={printReceipt}
                            className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg,#059669,#34d399)' }}>
                            <Download size={14} /> Download PDF
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded }) {
    const [form, setForm] = useState({ title: '', description: '', subject: '', price: '', tags: '' });
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState({});
    const fileRef = useRef(null);

    useEffect(() => {
        const h = e => { if (e.key === 'Escape' && !uploading) onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose, uploading]);

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
        <>
            <motion.div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={uploading ? undefined : onClose} />
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
                initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
                <div className="w-full max-w-xl rounded-2xl border p-8 pointer-events-auto max-h-[90vh] overflow-y-auto"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: '#fbbf24' }}>
                            <Crown size={18} className="inline mr-2" />Post Premium Note
                        </h2>
                        <button onClick={onClose} disabled={uploading} className="p-1.5 rounded-lg hover:bg-red-500 hover:text-white"
                            style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
                    </div>
                    <form onSubmit={submit}>
                        {[['title', 'Title'], ['subject', 'Subject']].map(([k, l]) => (
                            <div key={k} className="mb-4">
                                <label className="block text-sm font-semibold mb-1.5">{l} *</label>
                                <input type="text" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                                    className="form-input px-4" style={errors[k] ? { borderColor: 'var(--error)' } : {}} />
                                {errors[k] && <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors[k]}</p>}
                            </div>
                        ))}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold mb-1.5">Description *</label>
                            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                rows={3} className="form-input px-4 py-3" style={{ height: 'auto', resize: 'vertical', ...(errors.description ? { borderColor: 'var(--error)' } : {}) }} />
                            {errors.description && <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.description}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1.5">Price (FCFA) *</label>
                                <input type="number" min="1" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                    placeholder="500" className="form-input px-4" style={errors.price ? { borderColor: 'var(--error)' } : {}} />
                                {errors.price && <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.price}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1.5">Tags <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(comma-sep)</span></label>
                                <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                                    placeholder="math, calculus" className="form-input px-4" />
                            </div>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-semibold mb-1.5">File *</label>
                            <div onClick={() => fileRef.current?.click()}
                                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
                                style={{ borderColor: errors.file ? 'var(--error)' : 'var(--border-subtle)', background: 'var(--bg-hover)' }}>
                                <input ref={fileRef} type="file" className="hidden"
                                    accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp"
                                    onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
                                <Upload size={28} className="mx-auto mb-2" style={{ color: '#fbbf24' }} />
                                {file ? (
                                    <p className="font-semibold text-sm">{file.name} <span className="font-normal text-xs" style={{ color: 'var(--text-secondary)' }}>({(file.size / 1024 / 1024).toFixed(2)} MB)</span></p>
                                ) : (
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Click to select file (PDF, DOC, images, max 20MB)</p>
                                )}
                            </div>
                            {errors.file && <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--error)' }}><AlertCircle size={12} />{errors.file}</p>}
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button type="button" onClick={onClose} disabled={uploading}
                                className="px-5 py-2.5 rounded-lg border text-sm font-medium disabled:opacity-50"
                                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>Cancel</button>
                            <button type="submit" disabled={uploading}
                                className="px-5 py-2.5 rounded-xl font-semibold text-white text-sm inline-flex items-center gap-2 disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg,#d97706,#fbbf24)' }}>
                                {uploading ? <><Loader2 size={14} className="animate-spin" />Uploading…</> : <><Upload size={14} />Post Note</>}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </>
    );
}

// ── Note Card ─────────────────────────────────────────────────────────────────
function NoteCard({ note, onPurchase, isAdmin }) {
    const FileIcon = getFileIcon(note.file_type);
    const owned = note.purchased;

    return (
        <motion.div variants={cardVariant}
            className="rounded-2xl p-5 border flex flex-col relative overflow-hidden"
            style={{ background: 'var(--bg-card)', borderColor: 'rgba(251,191,36,0.25)' }}>
            {/* crown badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                <Crown size={11} /> PREMIUM
            </div>

            <div className="flex items-start gap-3 mb-3 pr-20">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(251,191,36,0.12)' }}>
                    <FileIcon size={20} style={{ color: '#fbbf24' }} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-snug truncate">{note.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full inline-block mt-1"
                        style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>{note.subject}</span>
                </div>
            </div>

            <p className="text-xs mb-4 flex-1 line-clamp-2" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {note.description}
            </p>

            <div className="flex justify-between text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1"><Download size={12} /> {note.downloads || 0}</span>
                <span>by {note.users?.first_name} {note.users?.last_name}</span>
            </div>

            <div className="flex items-center justify-between">
                <span className="text-base font-bold" style={{ color: '#fbbf24' }}>
                    {Number(note.price).toLocaleString()} FCFA
                </span>
                {owned || isAdmin ? (
                    <a href={`${API_ORIGIN}${note.file_path}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg,#059669,#34d399)' }}>
                        <Unlock size={13} /> Download
                    </a>
                ) : (
                    <button onClick={() => onPurchase(note)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg,#d97706,#fbbf24)' }}>
                        <Lock size={13} /> Buy
                    </button>
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

    const loadSub = async () => {
        try {
            const { data } = await api.get('/premium/subscription/status');
            setSubscription(data);
        } catch { }
        finally { setSubLoading(false); }
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

            // Poll every 3s, timeout after 60s
            const deadline = Date.now() + 60_000;
            pollRef.current = setInterval(async () => {
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
                            if (poll.file_path) window.open(`${API_ORIGIN}${poll.file_path}`, '_blank');
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
                    } else if (Date.now() > deadline) {
                        stopPolling();
                        setWaitingPhone(false);
                        setPaying(false);
                        toast.error('Payment timed out. Please try again.');
                    }
                } catch { /* keep polling on network hiccup */ }
            }, 3000);
        } catch (err) {
            setPaying(false);
            toast.error(err.response?.data?.error || 'Payment failed. Please try again.');
        }
    };

    return (
        <div className="lg:pl-60" style={{ background: 'var(--bg-main)', minHeight: '100vh', color: 'var(--text-primary)' }}>
            <Sidebar />

            {/* HERO */}
            <section className="pt-20 px-6 py-12 text-center border-b"
                style={{ background: 'linear-gradient(135deg,rgba(217,119,6,0.08),rgba(251,191,36,0.06))', borderColor: 'rgba(251,191,36,0.2)' }}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
                    style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                    <Crown size={15} /> Premium Notes
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                    Exclusive Study Materials
                </h1>
                <p className="max-w-xl mx-auto text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
                    High-quality notes curated by top students and tutors. Purchase individual notes or become a premium publisher.
                </p>

                {canPublish && (
                    <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold max-w-lg mx-auto mb-2"
                        style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
                        <Star size={15} /> Premium Publisher
                    </div>
                )}

                {/* Stats */}
                <div className="flex justify-center gap-12 flex-wrap mt-6">
                    {[[notes.length, 'Premium Notes'], [notes.reduce((s, n) => s + (n.downloads || 0), 0), 'Downloads']].map(([v, l]) => (
                        <div key={l} className="text-center">
                            <div className="text-3xl font-bold tabular-nums" style={{ fontFamily: "'Space Grotesk',sans-serif", color: '#fbbf24' }}>{v}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{l}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* TOOLBAR */}
            <div className="sticky top-16 z-30 px-4 sm:px-6 py-3 border-b flex justify-end items-center gap-3"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                {canPublish && (
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setShowUpload(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm"
                        style={{ background: 'linear-gradient(135deg,#d97706,#fbbf24)' }}>
                        <Upload size={15} /> Post Premium Note
                    </motion.button>
                )}
            </div>

            {/* GRID */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                                <div className="skeleton-shimmer h-4 rounded w-3/4 mb-3" />
                                <div className="skeleton-shimmer h-3 rounded w-full mb-2" />
                                <div className="skeleton-shimmer h-8 rounded mt-4" />
                            </div>
                        ))}
                    </div>
                ) : notes.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-4xl mb-4">👑</p>
                        <h3 className="text-xl font-semibold mb-2">No premium notes yet</h3>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {canPost ? 'Be the first to post a premium note!' : 'Check back soon.'}
                        </p>
                        {canPost && (
                            <button onClick={() => setShowUpload(true)}
                                className="mt-5 px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
                                style={{ background: 'linear-gradient(135deg,#d97706,#fbbf24)' }}>
                                Post First Note
                            </button>
                        )}
                    </div>
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
            <AnimatePresence>
                {showUpload && (
                    <UploadModal onClose={() => setShowUpload(false)}
                        onUploaded={() => { setShowUpload(false); loadNotes(); toast.success('Premium note posted!'); }} />
                )}
                {receipt && (
                    <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
                )}
                {payTarget && (
                    <PayModal
                        title={payTarget.type === 'subscribe' ? 'Subscribe as Publisher' : `Buy: ${payTarget.note?.title}`}
                        amount={payTarget.type === 'subscribe' ? 1000 : Number(payTarget.note?.price || 0)}
                        onConfirm={handlePay}
                        onClose={() => { if (!paying) { stopPolling(); setWaitingPhone(false); setPayTarget(null); } }}
                        loading={paying}
                        waitingPhone={waitingPhone}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
