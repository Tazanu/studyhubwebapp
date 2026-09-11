import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, GraduationCap, FileText, MessageSquare,
    CheckCircle, XCircle, ShieldCheck, ShieldOff, Search,
    TrendingUp, Clock, BarChart2, ChevronLeft, ChevronRight,
    Crown, Trash2, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { formatDate, formatNumber } from '../lib/formatDate';
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
    const { t } = useTranslation();
    if (!stats) return null;
    return (
        <motion.div variants={stagger()} initial="hidden" animate="show">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Users}        label={t('admin.statUsers')}          value={stats.users}            color="var(--brand-600)" />
                <StatCard icon={GraduationCap} label={t('admin.statApprovedTutors')} value={stats.tutors.approved}  color="#34d399" />
                <StatCard icon={Clock}         label={t('admin.statPendingTutors')}  value={stats.tutors.pending}   color="#fbbf24" sub={t('admin.statPendingSub')} />
                <StatCard icon={XCircle}       label={t('admin.statRejectedTutors')} value={stats.tutors.rejected}  color="#f87171" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={Users}         label={t('admin.statGroups')}        value={stats.groups}           color="#8b5cf6" />
                <StatCard icon={FileText}      label={t('admin.statNotes')}         value={stats.notes}            color="#60a5fa" />
                <StatCard icon={MessageSquare} label={t('admin.statQuestions')}     value={stats.questions}        color="#34d399" />
            </div>
        </motion.div>
    );
}

/* ── users tab ────────────────────────────────────────────────── */
function UsersTab() {
    const { t } = useTranslation();
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
            .catch(() => toast.error(i18n.t('admin.usersLoadFailed')))
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
            toast.success(u.is_active ? t('admin.userActivated') : t('admin.userDeactivated'));
        } catch { toast.error(t('admin.actionFailed')); }
    };

    const toggleRole = async (id, cur) => {
        const role = cur === 'admin' ? 'user' : 'admin';
        try {
            await api.patch(`/admin/users/${id}/role`, { role });
            setData(prev => prev.map(x => x.id === id ? { ...x, role } : x));
            toast.success(t('admin.roleSet', { role }));
        } catch { toast.error(t('admin.actionFailed')); }
    };

    return (
        <div>
            <form onSubmit={handleSearch} className="flex gap-2 mb-5">
                <div className="relative flex-1 max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-secondary" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('admin.searchPlaceholder')}
                        className="pl-9"
                    />
                </div>
                <Button type="submit">{t('admin.search')}</Button>
            </form>

            <p className="text-xs mb-3 text-fg-secondary">{t('admin.usersTotal', { n: total })}</p>

            <div className="rounded-2xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-surface-hover border-b border-border">
                                {['colName', 'colEmail', 'colUniversity', 'colRole', 'colTutor', 'colStatus', 'colActions'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-fg-secondary">{t(`admin.${h}`)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-10 text-sm text-fg-secondary">{t('admin.loading')}</td></tr>
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
                                        <Badge tone={u.is_active ? 'success' : 'danger'}>{u.is_active ? t('admin.active') : t('admin.banned')}</Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => toggleActive(u.id, u.is_active)}
                                                className={cn('p-1.5 rounded-lg transition-colors', u.is_active ? 'bg-danger-bg' : 'bg-success-bg')}
                                                title={u.is_active ? t('admin.banUser') : t('admin.activateUser')}>
                                                {u.is_active ? <ShieldOff size={14} className="text-danger" /> : <ShieldCheck size={14} className="text-success" />}
                                            </button>
                                            <button onClick={() => toggleRole(u.id, u.role)}
                                                className="p-1.5 rounded-lg transition-colors bg-primary-subtle"
                                                title={u.role === 'admin' ? t('admin.removeAdmin') : t('admin.makeAdmin')}>
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
                    <span className="text-sm text-fg-secondary">{t('admin.pageOf', { page, total: pages })}</span>
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
    const { t } = useTranslation();
    const [tutors,  setTutors]  = useState([]);
    const [filter,  setFilter]  = useState('pending');
    const [loading, setLoading] = useState(true);

    const load = (s = filter) => {
        setLoading(true);
        api.get(`/admin/tutors?status=${s}`)
            .then(({ data }) => setTutors(data))
            .catch(() => toast.error(i18n.t('admin.tutorsLoadFailed')))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const switchFilter = (s) => { setFilter(s); load(s); };

    const updateStatus = async (id, status) => {
        try {
            await api.patch(`/admin/tutors/${id}/status`, { status });
            toast.success(t('admin.tutorStatusSet', { status: t(`admin.${status === 'approved' ? 'approve' : 'reject'}`).toLowerCase() }));
            setTutors(prev => prev.filter(x => x.id !== id));
        } catch { toast.error(t('admin.actionFailed')); }
    };

    const STATUS_FILTERS = ['pending', 'approved', 'rejected', 'all'];
    const FILTER_LABELS = {
        pending:  t('admin.filterPending'),
        approved: t('admin.filterApproved'),
        rejected: t('admin.filterRejected'),
        all:      t('notes.filterAll'),
    };

    return (
        <div>
            <PillBar items={STATUS_FILTERS} active={filter} onChange={switchFilter} layoutId="tutor-filter" labels={FILTER_LABELS} />

            {loading ? (
                <div className="text-center py-16 text-sm text-fg-secondary mt-5">{t('admin.loading')}</div>
            ) : tutors.length === 0 ? (
                <EmptyState description={t('admin.noApplications', { filter: FILTER_LABELS[filter] ?? filter })} className="mt-5" />
            ) : (
                <motion.div className="flex flex-col gap-4 mt-5" variants={stagger(0.06)} initial="hidden" animate="show">
                    {tutors.map(tu => (
                        <motion.div key={tu.id} variants={fadeUp}
                            className="rounded-2xl p-6 border border-border bg-surface">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                {/* info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                                        <p className="font-semibold">{tu.users.first_name} {tu.users.last_name}</p>
                                        <Badge tone={STATUS_TONE[tu.status] ?? 'neutral'}>{t(`admin.${tu.status === 'approved' ? 'approve' : tu.status === 'rejected' ? 'reject' : 'pending'}`)}</Badge>
                                    </div>
                                    <p className="text-xs mb-1 text-fg-secondary">{tu.users.email} · {tu.users.university || t('admin.noUniversity')}</p>
                                    <p className="text-xs mb-3 text-fg-secondary">
                                        {t('admin.applied', { date: formatDate(tu.applied_at, { year: 'numeric', month: 'short', day: 'numeric' }) })}
                                        {' · '}{t('admin.perHour', { amount: formatNumber(tu.hourly_rate) })}
                                        {tu.years_experience ? ` · ${t('admin.yearsExp', { n: tu.years_experience })}` : ''}
                                    </p>

                                    {/* subjects */}
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {tu.subjects.map(s => (
                                            <Badge key={s} tone="primary" size="sm">{t(`subjectName.${s}`, { defaultValue: s })}</Badge>
                                        ))}
                                    </div>

                                    {/* bio */}
                                    <p className="text-sm leading-relaxed text-fg-secondary">
                                        {tu.bio}
                                    </p>

                                    {/* proof doc */}
                                    {tu.proof_document_url && (
                                        <a href={tu.proof_document_url} target="_blank" rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary">
                                            <FileText size={13} /> {t('admin.viewProof')}
                                        </a>
                                    )}
                                </div>

                                {/* actions */}
                                {tu.status === 'pending' && (
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <Button size="sm" icon={CheckCircle} onClick={() => updateStatus(tu.id, 'approved')} className="!bg-[image:none] bg-success">
                                            {t('admin.approve')}
                                        </Button>
                                        <Button size="sm" icon={XCircle} onClick={() => updateStatus(tu.id, 'rejected')} variant="danger" className="!bg-danger-bg !text-danger">
                                            {t('admin.reject')}
                                        </Button>
                                    </div>
                                )}
                                {tu.status === 'rejected' && (
                                    <Button size="sm" icon={CheckCircle} onClick={() => updateStatus(tu.id, 'approved')} className="!bg-[image:none] bg-success shrink-0">
                                        {t('admin.approve')}
                                    </Button>
                                )}
                                {tu.status === 'approved' && (
                                    <Button size="sm" icon={XCircle} onClick={() => updateStatus(tu.id, 'rejected')} variant="danger" className="!bg-danger-bg !text-danger shrink-0">
                                        {t('admin.revoke')}
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
    const { t } = useTranslation();
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
            toast.error(apiError(err, t('admin.openFileFailed')));
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
            .catch(err => { if (!cancelled) toast.error(apiError(err, i18n.t('admin.queueLoadFailed'))); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const decide = async (id, status, note) => {
        setBusyId(id);
        try {
            await api.patch(`/admin/premium/notes/${id}/review`, { status, note });
            toast.success(status === 'approved' ? t('admin.approvedOnSale') : t('admin.rejectedAuthorTold'));
            setNotes(prev => prev.filter(n => n.id !== id));
            setRejectingId(null);
            setReason('');
        } catch (err) {
            toast.error(apiError(err, t('admin.decisionFailed')));
        } finally {
            setBusyId(null);
        }
    };

    if (loading) return <div className="text-center py-16 text-sm text-fg-secondary">{t('admin.loading')}</div>;
    if (!notes.length) {
        return <EmptyState icon={ShieldCheck} title={t('admin.nothingWaiting')}
            description={t('admin.allReviewed')} className="mt-5" />;
    }

    return (
        <motion.div className="flex flex-col gap-4 mt-5" variants={stagger(0.06)} initial="hidden" animate="show">
            <p className="text-xs text-fg-secondary">
                {t('admin.awaitingReview', { count: notes.length })}
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
                                    {n.users?.first_name} {n.users?.last_name} · {t(`subjectName.${n.subject}`, { defaultValue: n.subject })} ·{' '}
                                    {formatNumber(n.price)} FCFA ·{' '}
                                    {formatDate(n.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                            <Badge tone="warning">{t('admin.pending')}</Badge>
                        </div>

                        <p className="text-sm leading-relaxed mb-4 text-fg-secondary">{n.description}</p>

                        {/* what the automated checks measured */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {stats.words != null && <Badge tone="neutral" size="sm">{t('admin.words', { n: stats.words })}</Badge>}
                            {stats.pages ? <Badge tone="neutral" size="sm">{t('admin.pages', { n: stats.pages })}</Badge> : null}
                            {stats.lexicalVariety != null && (
                                <Badge tone={stats.lexicalVariety < 0.25 ? 'warning' : 'neutral'} size="sm">
                                    {t('admin.variety', { n: stats.lexicalVariety })}
                                </Badge>
                            )}
                            {stats.bytes != null && <Badge tone="neutral" size="sm">{t('admin.kilobytes', { n: Math.round(stats.bytes / 1024) })}</Badge>}
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
                                {t('admin.openFile')}
                            </Button>
                        </div>

                        {rejectingId === n.id ? (
                            <div className="pt-3 border-t border-border">
                                <label htmlFor={`reason-${n.id}`} className="block text-xs font-semibold mb-2 text-fg-secondary">
                                    {t('admin.rejectReasonLabel')}
                                </label>
                                <Input
                                    id={`reason-${n.id}`}
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder={t('admin.rejectReasonPlaceholder')}
                                    className="mb-3"
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" variant="danger" disabled={!reason.trim() || busyId === n.id}
                                        loading={busyId === n.id} onClick={() => decide(n.id, 'rejected', reason)}>
                                        {t('admin.confirmRejection')}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setReason(''); }}>
                                        {t('common.cancel')}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2 pt-3 border-t border-border">
                                <Button size="sm" icon={CheckCircle} loading={busyId === n.id}
                                    onClick={() => decide(n.id, 'approved')} className="!bg-[image:none] bg-success">
                                    {t('admin.approve')}
                                </Button>
                                <Button size="sm" icon={XCircle} variant="danger"
                                    onClick={() => { setRejectingId(n.id); setReason(''); }}
                                    className="!bg-danger-bg !text-danger">
                                    {t('admin.reject')}
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
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState('notes');
    const [notes, setNotes] = useState([]);
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadNotes = () => {
        setLoading(true);
        api.get('/admin/premium/notes')
            .then(({ data }) => setNotes(data))
            .catch(() => toast.error(i18n.t('admin.premiumLoadFailed')))
            .finally(() => setLoading(false));
    };

    const loadSubs = () => {
        setLoading(true);
        api.get('/admin/premium/subscriptions')
            .then(({ data }) => setSubs(data))
            .catch(() => toast.error(i18n.t('admin.subsLoadFailed')))
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
            toast.success(data.is_active ? t('admin.noteActivated') : t('admin.noteDeactivated'));
        } catch { toast.error(t('admin.actionFailed')); }
    };

    const deleteNote = async (id) => {
        if (!window.confirm(t('admin.confirmDeleteNote'))) return;
        try {
            await api.delete(`/admin/premium/notes/${id}`);
            setNotes(prev => prev.filter(n => n.id !== id));
            toast.success(t('admin.noteDeleted'));
        } catch { toast.error(t('admin.deleteFailed')); }
    };

    const totalRevenue = notes.reduce((sum, n) => sum + (Number(n.price) * (n._count?.purchased_notes || 0)), 0);

    return (
        <div>
            {/* section toggle */}
            <div className="mb-6">
                <PillBar items={['notes', 'subscriptions']} active={activeSection} onChange={switchSection} layoutId="premium-section"
                    labels={{ notes: t('admin.sectionNotes'), subscriptions: t('admin.sectionSubscriptions') }} />
            </div>

            {activeSection === 'notes' && (
                <>
                    {/* revenue summary */}
                    <div className="flex gap-4 mb-6 flex-wrap">
                        <div className="rounded-2xl p-5 border border-premium/25 bg-surface flex items-center gap-4">
                            <Crown size={22} className="text-premium" />
                            <div>
                                <p className="text-xs text-fg-secondary">{t('admin.totalNotes')}</p>
                                <p className="text-2xl font-bold text-premium">{notes.length}</p>
                            </div>
                        </div>
                        <div className="rounded-2xl p-5 border border-success/25 bg-surface flex items-center gap-4">
                            <TrendingUp size={22} className="text-success" />
                            <div>
                                <p className="text-xs text-fg-secondary">{t('admin.estRevenue')}</p>
                                <p className="text-2xl font-bold text-success">{formatNumber(totalRevenue)} FCFA</p>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-16 text-sm text-fg-secondary">Loading…</div>
                    ) : notes.length === 0 ? (
                        <EmptyState description={t('admin.noPremiumNotes')} />
                    ) : (
                        <div className="rounded-2xl border border-border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-surface-hover border-b border-border">
                                            {['colTitle', 'colSubject', 'colPrice', 'colSales', 'colAuthor', 'colStatus', 'colActions'].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-fg-secondary">{t(`admin.${h}`)}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {notes.map((n, i) => (
                                            <tr key={n.id} className={cn('border-b border-border', i % 2 === 0 ? 'bg-surface' : 'bg-bg')}>
                                                <td className="px-4 py-3 font-medium max-w-[180px] truncate">{n.title}</td>
                                                <td className="px-4 py-3 text-xs text-fg-secondary">{t(`subjectName.${n.subject}`, { defaultValue: n.subject })}</td>
                                                <td className="px-4 py-3 font-semibold text-premium">{formatNumber(n.price)} FCFA</td>
                                                <td className="px-4 py-3 text-xs">{n._count?.purchased_notes || 0}</td>
                                                <td className="px-4 py-3 text-xs text-fg-secondary">{n.users?.first_name} {n.users?.last_name}</td>
                                                <td className="px-4 py-3">
                                                    <Badge tone={n.is_active ? 'success' : 'danger'}>{n.is_active ? t('admin.active') : t('admin.hidden')}</Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => toggleNote(n.id, n.is_active)}
                                                            className={cn('p-1.5 rounded-lg', n.is_active ? 'bg-warning-bg' : 'bg-success-bg')}
                                                            title={n.is_active ? t('admin.hideNote') : t('admin.showNote')}>
                                                            {n.is_active ? <ToggleRight size={14} className="text-warning" /> : <ToggleLeft size={14} className="text-success" />}
                                                        </button>
                                                        <button onClick={() => deleteNote(n.id)}
                                                            className="p-1.5 rounded-lg bg-danger-bg"
                                                            title={t('admin.deleteNote')}>
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
                    <EmptyState description={t('admin.noSubscriptions')} />
                ) : (
                    <div className="rounded-2xl border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-surface-hover border-b border-border">
                                        {['colUser', 'colEmail', 'colStatus', 'colExpires', 'colSubscribed'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-fg-secondary">{t(`admin.${h}`)}</th>
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
                                                    <Badge tone={!expired ? 'success' : 'danger'}>{!expired ? t('admin.active') : t('admin.expired')}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-fg-secondary">
                                                    {formatDate(s.expires_at)}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-fg-secondary">
                                                    {formatDate(s.created_at)}
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
    const { t } = useTranslation();
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
    const TAB_LABELS = Object.fromEntries(TABS.map(key => {
        const Icon = TAB_ICONS[key];
        return [key, (
            <span key={key} className="flex items-center gap-2">
                <Icon size={15} /> {t(`admin.tab${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
                {key === 'review' && pendingReviews > 0 && (
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
                            {t('admin.pageTitle')}
                        </h1>
                        <p className="text-sm mt-1 text-fg-secondary">
                            {t('admin.pageSubtitle')}
                        </p>
                    </div>
                    {stats?.tutors?.pending > 0 && (
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                            <Badge tone="warning" size="md" icon={Clock}>
                                {t('admin.awaitingTutorReview', { count: stats.tutors.pending })}
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
