import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, GraduationCap, FileText, MessageSquare,
    CheckCircle, XCircle, ShieldCheck, ShieldOff, Search,
    TrendingUp, Clock, BarChart2, ChevronLeft, ChevronRight,
    Crown, Trash2, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { toast } from 'sonner';
import api, { apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import { cn } from '../lib/cn';

/* ── variants ─────────────────────────────────────────────────── */
const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = (s = 0.07) => ({ hidden: {}, show: { transition: { staggerChildren: s } } });

const TABS = ['overview', 'users', 'tutors', 'review', 'premium'];

const STATUS_TONE = { approved: 'success', pending: 'warning', rejected: 'danger' };

/* ── tab pill bar (shared by admin tabs, tutor filter, premium sections) ── */
function PillBar({ items, active, onChange, layoutId, labels }) {
    return (
        <div className="flex gap-1 p-1 rounded-xl border border-border bg-surface w-fit">
            {items.map(item => {
                const isActive = active === item;
                return (
                    <motion.button key={item} onClick={() => onChange(item)} whileTap={{ scale: 0.96 }}
                        className={cn('relative px-4 py-1.5 rounded-lg text-sm font-medium capitalize', isActive ? 'text-white' : 'text-fg-secondary')}
                        style={{ zIndex: 1 }}>
                        {isActive && (
                            <motion.span layoutId={layoutId}
                                className="absolute inset-0 rounded-lg bg-primary"
                                style={{ zIndex: -1 }}
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                        )}
                        {labels?.[item] ?? item}
                    </motion.button>
                );
            })}
        </div>
    );
}

/* ── stat card ────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color, sub }) {
    return (
        <motion.div variants={fadeUp}
            className="rounded-2xl p-6 border border-border bg-surface flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}1a` }}>
                <Icon size={22} color={color} strokeWidth={1.75} />
            </div>
            <div>
                <p className="text-xs font-medium mb-0.5 text-fg-secondary">{label}</p>
                <p className="text-2xl font-bold tabular-nums" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", color }}>{value}</p>
                {sub && <p className="text-xs text-fg-secondary">{sub}</p>}
            </div>
        </motion.div>
    );
}

/* ── overview tab ─────────────────────────────────────────────── */
function Overview({ stats }) {
    if (!stats) return null;
    return (
        <motion.div variants={stagger()} initial="hidden" animate="show">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Users}        label="Total Users"       value={stats.users}            color="var(--brand-600)" />
                <StatCard icon={GraduationCap} label="Approved Tutors"  value={stats.tutors.approved}  color="#34d399" />
                <StatCard icon={Clock}         label="Pending Tutors"   value={stats.tutors.pending}   color="#fbbf24" sub="need review" />
                <StatCard icon={XCircle}       label="Rejected Tutors"  value={stats.tutors.rejected}  color="#f87171" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={Users}         label="Study Groups"     value={stats.groups}           color="#8b5cf6" />
                <StatCard icon={FileText}      label="Notes Shared"     value={stats.notes}            color="#60a5fa" />
                <StatCard icon={MessageSquare} label="Questions Asked"  value={stats.questions}        color="#34d399" />
            </div>
        </motion.div>
    );
}

/* ── users tab ────────────────────────────────────────────────── */
function UsersTab() {
    const [data,    setData]    = useState([]);
    const [total,   setTotal]   = useState(0);
    const [pages,   setPages]   = useState(1);
    const [page,    setPage]    = useState(1);
    const [search,  setSearch]  = useState('');
    const [query,   setQuery]   = useState('');
    const [loading, setLoading] = useState(true);

    const load = (p = 1, q = query) => {
        setLoading(true);
        api.get(`/admin/users?page=${p}&limit=15${q ? `&search=${q}` : ''}`)
            .then(({ data: r }) => { setData(r.data); setTotal(r.total); setPages(r.pages); setPage(p); })
            .catch(() => toast.error('Failed to load users'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        setQuery(search);
        load(1, search);
    };

    const toggleActive = async (id, cur) => {
        try {
            const { data: u } = await api.patch(`/admin/users/${id}/toggle`);
            setData(prev => prev.map(x => x.id === id ? { ...x, is_active: u.is_active } : x));
            toast.success(u.is_active ? 'User activated' : 'User deactivated');
        } catch { toast.error('Failed'); }
    };

    const toggleRole = async (id, cur) => {
        const role = cur === 'admin' ? 'user' : 'admin';
        try {
            await api.patch(`/admin/users/${id}/role`, { role });
            setData(prev => prev.map(x => x.id === id ? { ...x, role } : x));
            toast.success(`Role set to ${role}`);
        } catch { toast.error('Failed'); }
    };

    return (
        <div>
            <form onSubmit={handleSearch} className="flex gap-2 mb-5">
                <div className="relative flex-1 max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-secondary" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or email…"
                        className="pl-9"
                    />
                </div>
                <Button type="submit">Search</Button>
            </form>

            <p className="text-xs mb-3 text-fg-secondary">{total} users total</p>

            <div className="rounded-2xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-surface-hover border-b border-border">
                                {['Name', 'Email', 'University', 'Role', 'Tutor', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-fg-secondary">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-10 text-sm text-fg-secondary">Loading…</td></tr>
                            ) : data.map((u, i) => (
                                <tr key={u.id} className={cn('border-b border-border', i % 2 === 0 ? 'bg-surface' : 'bg-bg')}>
                                    <td className="px-4 py-3 font-medium whitespace-nowrap">{u.first_name} {u.last_name}</td>
                                    <td className="px-4 py-3 text-xs text-fg-secondary">{u.email}</td>
                                    <td className="px-4 py-3 text-xs max-w-[140px] truncate text-fg-secondary">{u.university || '—'}</td>
                                    <td className="px-4 py-3">
                                        <Badge tone={u.role === 'admin' ? 'primary' : 'neutral'}>{u.role}</Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        {u.tutors ? (
                                            <Badge tone={STATUS_TONE[u.tutors.status] ?? 'neutral'}>{u.tutors.status}</Badge>
                                        ) : <span className="text-xs text-fg-secondary">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge tone={u.is_active ? 'success' : 'danger'}>{u.is_active ? 'Active' : 'Banned'}</Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => toggleActive(u.id, u.is_active)}
                                                className={cn('p-1.5 rounded-lg transition-colors', u.is_active ? 'bg-danger-bg' : 'bg-success-bg')}
                                                title={u.is_active ? 'Ban user' : 'Activate user'}>
                                                {u.is_active ? <ShieldOff size={14} className="text-danger" /> : <ShieldCheck size={14} className="text-success" />}
                                            </button>
                                            <button onClick={() => toggleRole(u.id, u.role)}
                                                className="p-1.5 rounded-lg transition-colors bg-primary-subtle"
                                                title={u.role === 'admin' ? 'Remove admin' : 'Make admin'}>
                                                <ShieldCheck size={14} className="text-primary" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* pagination */}
            {pages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-5">
                    <button disabled={page === 1} onClick={() => load(page - 1)}
                        className="p-2 rounded-lg border border-border disabled:opacity-30">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-fg-secondary">Page {page} of {pages}</span>
                    <button disabled={page === pages} onClick={() => load(page + 1)}
                        className="p-2 rounded-lg border border-border disabled:opacity-30">
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── tutors tab ───────────────────────────────────────────────── */
function TutorsTab() {
    const [tutors,  setTutors]  = useState([]);
    const [filter,  setFilter]  = useState('pending');
    const [loading, setLoading] = useState(true);

    const load = (s = filter) => {
        setLoading(true);
        api.get(`/admin/tutors?status=${s}`)
            .then(({ data }) => setTutors(data))
            .catch(() => toast.error('Failed to load tutors'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const switchFilter = (s) => { setFilter(s); load(s); };

    const updateStatus = async (id, status) => {
        try {
            await api.patch(`/admin/tutors/${id}/status`, { status });
            toast.success(`Tutor ${status}`);
            setTutors(prev => prev.filter(t => t.id !== id));
        } catch { toast.error('Failed'); }
    };

    const STATUS_FILTERS = ['pending', 'approved', 'rejected', 'all'];

    return (
        <div>
            <PillBar items={STATUS_FILTERS} active={filter} onChange={switchFilter} layoutId="tutor-filter" />

            {loading ? (
                <div className="text-center py-16 text-sm text-fg-secondary mt-5">Loading…</div>
            ) : tutors.length === 0 ? (
                <EmptyState description={`No ${filter} applications.`} className="mt-5" />
            ) : (
                <motion.div className="flex flex-col gap-4 mt-5" variants={stagger(0.06)} initial="hidden" animate="show">
                    {tutors.map(t => (
                        <motion.div key={t.id} variants={fadeUp}
                            className="rounded-2xl p-6 border border-border bg-surface">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                {/* info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                                        <p className="font-semibold">{t.users.first_name} {t.users.last_name}</p>
                                        <Badge tone={STATUS_TONE[t.status] ?? 'neutral'}>{t.status}</Badge>
                                    </div>
                                    <p className="text-xs mb-1 text-fg-secondary">{t.users.email} · {t.users.university || 'No university'}</p>
                                    <p className="text-xs mb-3 text-fg-secondary">
                                        Applied: {new Date(t.applied_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        {' · '}{Number(t.hourly_rate).toLocaleString()} FCFA/hr
                                        {t.years_experience ? ` · ${t.years_experience} yrs exp` : ''}
                                    </p>

                                    {/* subjects */}
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {t.subjects.map(s => (
                                            <Badge key={s} tone="primary" size="sm">{s}</Badge>
                                        ))}
                                    </div>

                                    {/* bio */}
                                    <p className="text-sm leading-relaxed text-fg-secondary">
                                        {t.bio}
                                    </p>

                                    {/* proof doc */}
                                    {t.proof_document_url && (
                                        <a href={t.proof_document_url} target="_blank" rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary">
                                            <FileText size={13} /> View proof document
                                        </a>
                                    )}
                                </div>

                                {/* actions */}
                                {t.status === 'pending' && (
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <Button size="sm" icon={CheckCircle} onClick={() => updateStatus(t.id, 'approved')} className="!bg-[image:none] bg-success">
                                            Approve
                                        </Button>
                                        <Button size="sm" icon={XCircle} onClick={() => updateStatus(t.id, 'rejected')} variant="danger" className="!bg-danger-bg !text-danger">
                                            Reject
                                        </Button>
                                    </div>
                                )}
                                {t.status === 'rejected' && (
                                    <Button size="sm" icon={CheckCircle} onClick={() => updateStatus(t.id, 'approved')} className="!bg-[image:none] bg-success shrink-0">
                                        Approve
                                    </Button>
                                )}
                                {t.status === 'approved' && (
                                    <Button size="sm" icon={XCircle} onClick={() => updateStatus(t.id, 'rejected')} variant="danger" className="!bg-danger-bg !text-danger shrink-0">
                                        Revoke
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}

/* ── review queue ─────────────────────────────────────────────── */
/**
 * Paid notes awaiting a decision.
 *
 * The automated checks in the API already rejected the obviously unfit, and
 * their report is shown here as context. The job on this screen is the part no
 * check can do: open the file, read it, and decide whether it is correct enough
 * to sell to a student.
 */
function ReviewTab() {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [openingId, setOpeningId] = useState(null);
    const [rejectingId, setRejectingId] = useState(null);
    const [reason, setReason] = useState('');

    /**
     * Fetch the note with credentials and open it as a blob.
     *
     * The file route is auth-gated, so a normal link in a new tab would arrive
     * without the token and be refused.
     */
    const openFile = async (note) => {
        setOpeningId(note.id);
        try {
            const res = await api.get(`/premium/notes/${note.id}/file`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank', 'noopener');
            // Give the new tab time to take the URL before releasing it.
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (err) {
            toast.error(apiError(err, 'Could not open the file'));
        } finally {
            setOpeningId(null);
        }
    };

    // All state updates happen in async callbacks, never synchronously inside
    // the effect, so mounting cannot trigger a cascading re-render.
    useEffect(() => {
        let cancelled = false;
        api.get('/admin/premium/notes/pending')
            .then(({ data }) => { if (!cancelled) setNotes(data); })
            .catch(err => { if (!cancelled) toast.error(apiError(err, 'Failed to load the review queue')); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const decide = async (id, status, note) => {
        setBusyId(id);
        try {
            await api.patch(`/admin/premium/notes/${id}/review`, { status, note });
            toast.success(status === 'approved' ? 'Approved and now on sale' : 'Rejected — the author has been told why');
            setNotes(prev => prev.filter(n => n.id !== id));
            setRejectingId(null);
            setReason('');
        } catch (err) {
            toast.error(apiError(err, 'Failed to record the decision'));
        } finally {
            setBusyId(null);
        }
    };

    if (loading) return <div className="text-center py-16 text-sm text-fg-secondary">Loading…</div>;
    if (!notes.length) {
        return <EmptyState icon={ShieldCheck} title="Nothing waiting"
            description="Every submitted note has been reviewed." className="mt-5" />;
    }

    return (
        <motion.div className="flex flex-col gap-4 mt-5" variants={stagger(0.06)} initial="hidden" animate="show">
            <p className="text-xs text-fg-secondary">
                {notes.length} note{notes.length === 1 ? '' : 's'} awaiting review. Nothing here is visible to buyers
                or purchasable until approved.
            </p>

            {notes.map(n => {
                const q = n.quality_report || {};
                const stats = q.stats || {};
                return (
                    <motion.div key={n.id} variants={fadeUp} className="rounded-2xl p-6 border border-border bg-surface">
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold">{n.title}</p>
                                <p className="text-xs mt-0.5 text-fg-secondary">
                                    {n.users?.first_name} {n.users?.last_name} · {n.subject} ·{' '}
                                    {Number(n.price).toLocaleString()} FCFA ·{' '}
                                    {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                            <Badge tone="warning">pending</Badge>
                        </div>

                        <p className="text-sm leading-relaxed mb-4 text-fg-secondary">{n.description}</p>

                        {/* what the automated checks measured */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {stats.words != null && <Badge tone="neutral" size="sm">{stats.words} words</Badge>}
                            {stats.pages ? <Badge tone="neutral" size="sm">{stats.pages} pages</Badge> : null}
                            {stats.lexicalVariety != null && (
                                <Badge tone={stats.lexicalVariety < 0.25 ? 'warning' : 'neutral'} size="sm">
                                    variety {stats.lexicalVariety}
                                </Badge>
                            )}
                            {stats.bytes != null && <Badge tone="neutral" size="sm">{Math.round(stats.bytes / 1024)} KB</Badge>}
                        </div>

                        {q.warnings?.length > 0 && (
                            <div className="mb-4 px-3 py-2 rounded-lg text-xs bg-warning-bg text-warning border border-warning/25">
                                {q.warnings.map((w, i) => <p key={i}>{w}</p>)}
                            </div>
                        )}

                        {/* Reading the file is the actual review. A plain link
                            cannot be used: the endpoint needs the auth header,
                            which a new tab would not send, so fetch the bytes
                            and hand the browser a blob. */}
                        <div className="mb-4">
                            <Button size="sm" variant="secondary" icon={FileText}
                                loading={openingId === n.id} onClick={() => openFile(n)}>
                                Open the file and read it before deciding
                            </Button>
                        </div>

                        {rejectingId === n.id ? (
                            <div className="pt-3 border-t border-border">
                                <label htmlFor={`reason-${n.id}`} className="block text-xs font-semibold mb-2 text-fg-secondary">
                                    Why is this being rejected? The author sees this, so be specific enough to act on.
                                </label>
                                <Input
                                    id={`reason-${n.id}`}
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="e.g. Section 3 states the derivative of x² as 3x — this is wrong and would mislead students."
                                    className="mb-3"
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" variant="danger" disabled={!reason.trim() || busyId === n.id}
                                        loading={busyId === n.id} onClick={() => decide(n.id, 'rejected', reason)}>
                                        Confirm rejection
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setReason(''); }}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2 pt-3 border-t border-border">
                                <Button size="sm" icon={CheckCircle} loading={busyId === n.id}
                                    onClick={() => decide(n.id, 'approved')} className="!bg-[image:none] bg-success">
                                    Approve
                                </Button>
                                <Button size="sm" icon={XCircle} variant="danger"
                                    onClick={() => { setRejectingId(n.id); setReason(''); }}
                                    className="!bg-danger-bg !text-danger">
                                    Reject
                                </Button>
                            </div>
                        )}
                    </motion.div>
                );
            })}
        </motion.div>
    );
}

/* ── premium tab ──────────────────────────────────────────────── */
function PremiumTab() {
    const [activeSection, setActiveSection] = useState('notes');
    const [notes, setNotes] = useState([]);
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadNotes = () => {
        setLoading(true);
        api.get('/admin/premium/notes')
            .then(({ data }) => setNotes(data))
            .catch(() => toast.error('Failed to load premium notes'))
            .finally(() => setLoading(false));
    };

    const loadSubs = () => {
        setLoading(true);
        api.get('/admin/premium/subscriptions')
            .then(({ data }) => setSubs(data))
            .catch(() => toast.error('Failed to load subscriptions'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadNotes(); }, []);

    const switchSection = (s) => {
        setActiveSection(s);
        if (s === 'notes') loadNotes();
        else loadSubs();
    };

    const toggleNote = async (id, cur) => {
        try {
            const { data } = await api.patch(`/admin/premium/notes/${id}/toggle`);
            setNotes(prev => prev.map(n => n.id === id ? { ...n, is_active: data.is_active } : n));
            toast.success(data.is_active ? 'Note activated' : 'Note deactivated');
        } catch { toast.error('Failed'); }
    };

    const deleteNote = async (id) => {
        if (!window.confirm('Delete this premium note permanently?')) return;
        try {
            await api.delete(`/admin/premium/notes/${id}`);
            setNotes(prev => prev.filter(n => n.id !== id));
            toast.success('Note deleted');
        } catch { toast.error('Failed to delete'); }
    };

    const totalRevenue = notes.reduce((sum, n) => sum + (Number(n.price) * (n._count?.purchased_notes || 0)), 0);

    return (
        <div>
            {/* section toggle */}
            <div className="mb-6">
                <PillBar items={['notes', 'subscriptions']} active={activeSection} onChange={switchSection} layoutId="premium-section" />
            </div>

            {activeSection === 'notes' && (
                <>
                    {/* revenue summary */}
                    <div className="flex gap-4 mb-6 flex-wrap">
                        <div className="rounded-2xl p-5 border border-premium/25 bg-surface flex items-center gap-4">
                            <Crown size={22} className="text-premium" />
                            <div>
                                <p className="text-xs text-fg-secondary">Total Notes</p>
                                <p className="text-2xl font-bold text-premium">{notes.length}</p>
                            </div>
                        </div>
                        <div className="rounded-2xl p-5 border border-success/25 bg-surface flex items-center gap-4">
                            <TrendingUp size={22} className="text-success" />
                            <div>
                                <p className="text-xs text-fg-secondary">Est. Revenue</p>
                                <p className="text-2xl font-bold text-success">{totalRevenue.toLocaleString()} FCFA</p>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-16 text-sm text-fg-secondary">Loading…</div>
                    ) : notes.length === 0 ? (
                        <EmptyState description="No premium notes yet." />
                    ) : (
                        <div className="rounded-2xl border border-border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-surface-hover border-b border-border">
                                            {['Title', 'Subject', 'Price', 'Sales', 'Author', 'Status', 'Actions'].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-fg-secondary">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {notes.map((n, i) => (
                                            <tr key={n.id} className={cn('border-b border-border', i % 2 === 0 ? 'bg-surface' : 'bg-bg')}>
                                                <td className="px-4 py-3 font-medium max-w-[180px] truncate">{n.title}</td>
                                                <td className="px-4 py-3 text-xs text-fg-secondary">{n.subject}</td>
                                                <td className="px-4 py-3 font-semibold text-premium">{Number(n.price).toLocaleString()} FCFA</td>
                                                <td className="px-4 py-3 text-xs">{n._count?.purchased_notes || 0}</td>
                                                <td className="px-4 py-3 text-xs text-fg-secondary">{n.users?.first_name} {n.users?.last_name}</td>
                                                <td className="px-4 py-3">
                                                    <Badge tone={n.is_active ? 'success' : 'danger'}>{n.is_active ? 'Active' : 'Hidden'}</Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => toggleNote(n.id, n.is_active)}
                                                            className={cn('p-1.5 rounded-lg', n.is_active ? 'bg-warning-bg' : 'bg-success-bg')}
                                                            title={n.is_active ? 'Hide note' : 'Show note'}>
                                                            {n.is_active ? <ToggleRight size={14} className="text-warning" /> : <ToggleLeft size={14} className="text-success" />}
                                                        </button>
                                                        <button onClick={() => deleteNote(n.id)}
                                                            className="p-1.5 rounded-lg bg-danger-bg"
                                                            title="Delete note">
                                                            <Trash2 size={14} className="text-danger" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {activeSection === 'subscriptions' && (
                loading ? (
                    <div className="text-center py-16 text-sm text-fg-secondary">Loading…</div>
                ) : subs.length === 0 ? (
                    <EmptyState description="No subscriptions yet." />
                ) : (
                    <div className="rounded-2xl border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-surface-hover border-b border-border">
                                        {['User', 'Email', 'Status', 'Expires', 'Subscribed'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-fg-secondary">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {subs.map((s, i) => {
                                        const expired = new Date(s.expires_at) < new Date();
                                        return (
                                            <tr key={s.id} className={cn('border-b border-border', i % 2 === 0 ? 'bg-surface' : 'bg-bg')}>
                                                <td className="px-4 py-3 font-medium">{s.users?.first_name} {s.users?.last_name}</td>
                                                <td className="px-4 py-3 text-xs text-fg-secondary">{s.users?.email}</td>
                                                <td className="px-4 py-3">
                                                    <Badge tone={!expired ? 'success' : 'danger'}>{!expired ? 'Active' : 'Expired'}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-fg-secondary">
                                                    {new Date(s.expires_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-fg-secondary">
                                                    {new Date(s.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}

/* ── main ─────────────────────────────────────────────────────── */
export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tab,   setTab]   = useState('overview');
    const [stats, setStats] = useState(null);
    const [pendingReviews, setPendingReviews] = useState(0);

    useEffect(() => {
        if (user?.role !== 'admin') { navigate('/dashboard'); return; }
        api.get('/admin/stats').then(({ data }) => setStats(data)).catch(() => {});
        // Surfaced on the tab itself — a review queue nobody notices is a queue
        // that silently blocks every tutor waiting on it.
        api.get('/admin/premium/notes/pending')
            .then(({ data }) => setPendingReviews(data.length))
            .catch(() => {});
    }, [user]);

    if (user?.role !== 'admin') return null;

    const TAB_ICONS = { overview: BarChart2, users: Users, tutors: GraduationCap, review: ShieldCheck, premium: Crown };
    const TAB_LABELS = Object.fromEntries(TABS.map(t => {
        const Icon = TAB_ICONS[t];
        return [t, (
            <span key={t} className="flex items-center gap-2">
                <Icon size={15} /> {t}
                {t === 'review' && pendingReviews > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none bg-warning text-white">
                        {pendingReviews}
                    </span>
                )}
            </span>
        )];
    }));

    return (
        <div className="lg:pl-60 min-h-screen bg-bg">
            <main className="pt-20 pb-16 px-4 md:px-8 max-w-6xl mx-auto">

                {/* header */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold gradient-text" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                            Admin Dashboard
                        </h1>
                        <p className="text-sm mt-1 text-fg-secondary">
                            Manage users, tutors, and platform activity
                        </p>
                    </div>
                    {stats?.tutors?.pending > 0 && (
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                            <Badge tone="warning" size="md" icon={Clock}>
                                {stats.tutors.pending} tutor{stats.tutors.pending > 1 ? 's' : ''} awaiting review
                            </Badge>
                        </motion.div>
                    )}
                </div>

                {/* tabs */}
                <div className="mb-8">
                    <PillBar items={TABS} active={tab} onChange={setTab} layoutId="admin-tab" labels={TAB_LABELS} />
                </div>

                {/* tab content */}
                <AnimatePresence mode="wait">
                    <motion.div key={tab}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.22 }}>
                        {tab === 'overview' && <Overview stats={stats} />}
                        {tab === 'users'    && <UsersTab />}
                        {tab === 'tutors'   && <TutorsTab />}
                        {tab === 'review'   && <ReviewTab />}
                        {tab === 'premium'  && <PremiumTab />}
                    </motion.div>
                </AnimatePresence>

            </main>
        </div>
    );
}
