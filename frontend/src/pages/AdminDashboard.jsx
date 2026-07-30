import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, GraduationCap, FileText, MessageSquare, BookOpen,
    CheckCircle, XCircle, ShieldCheck, ShieldOff, Search,
    TrendingUp, Clock, BarChart2, ChevronLeft, ChevronRight,
    Crown, Trash2, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/* ── variants ─────────────────────────────────────────────────── */
const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = (s = 0.07) => ({ hidden: {}, show: { transition: { staggerChildren: s } } });

const TABS = ['overview', 'users', 'tutors', 'premium'];

/* ── stat card ────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color, sub }) {
    return (
        <motion.div variants={fadeUp}
            className="rounded-2xl p-6 border flex items-center gap-4"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}1a` }}>
                <Icon size={22} color={color} strokeWidth={1.75} />
            </div>
            <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                <p className="text-2xl font-bold tabular-nums" style={{ fontFamily: "'Space Grotesk',sans-serif", color }}>{value}</p>
                {sub && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
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
                <StatCard icon={Users}        label="Total Users"       value={stats.users}            color="var(--accent-blue)" />
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
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or email…"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                </div>
                <button type="submit" className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'var(--accent-blue)' }}>Search</button>
            </form>

            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{total} users total</p>

            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-subtle)' }}>
                                {['Name', 'Email', 'University', 'Role', 'Tutor', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                                        style={{ color: 'var(--text-secondary)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-10 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</td></tr>
                            ) : data.map((u, i) => (
                                <tr key={u.id}
                                    style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-main)' }}>
                                    <td className="px-4 py-3 font-medium whitespace-nowrap">{u.first_name} {u.last_name}</td>
                                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                                    <td className="px-4 py-3 text-xs max-w-[140px] truncate" style={{ color: 'var(--text-secondary)' }}>{u.university || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                            style={{ background: u.role === 'admin' ? 'rgba(139,92,246,0.15)' : 'var(--bg-hover)', color: u.role === 'admin' ? '#8b5cf6' : 'var(--text-secondary)' }}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {u.tutors ? (
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                style={{
                                                    background: u.tutors.status === 'approved' ? 'rgba(52,211,153,0.12)' : u.tutors.status === 'pending' ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.12)',
                                                    color: u.tutors.status === 'approved' ? '#34d399' : u.tutors.status === 'pending' ? '#fbbf24' : '#f87171',
                                                }}>
                                                {u.tutors.status}
                                            </span>
                                        ) : <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                            style={{ background: u.is_active ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: u.is_active ? '#34d399' : '#f87171' }}>
                                            {u.is_active ? 'Active' : 'Banned'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => toggleActive(u.id, u.is_active)}
                                                className="p-1.5 rounded-lg transition-colors"
                                                style={{ background: u.is_active ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)' }}
                                                title={u.is_active ? 'Ban user' : 'Activate user'}>
                                                {u.is_active ? <ShieldOff size={14} color="#f87171" /> : <ShieldCheck size={14} color="#34d399" />}
                                            </button>
                                            <button onClick={() => toggleRole(u.id, u.role)}
                                                className="p-1.5 rounded-lg transition-colors"
                                                style={{ background: 'rgba(139,92,246,0.1)' }}
                                                title={u.role === 'admin' ? 'Remove admin' : 'Make admin'}>
                                                <ShieldCheck size={14} color="#8b5cf6" />
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
                        className="p-2 rounded-lg border disabled:opacity-30"
                        style={{ borderColor: 'var(--border-subtle)' }}>
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Page {page} of {pages}</span>
                    <button disabled={page === pages} onClick={() => load(page + 1)}
                        className="p-2 rounded-lg border disabled:opacity-30"
                        style={{ borderColor: 'var(--border-subtle)' }}>
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
            {/* filter pills */}
            <div className="flex gap-1 p-1 rounded-xl border w-fit mb-5"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                {STATUS_FILTERS.map(s => {
                    const active = filter === s;
                    return (
                        <motion.button key={s} onClick={() => switchFilter(s)} whileTap={{ scale: 0.96 }}
                            className="relative px-4 py-1.5 rounded-lg text-sm font-medium capitalize"
                            style={{ color: active ? '#fff' : 'var(--text-secondary)', zIndex: 1 }}>
                            {active && (
                                <motion.span layoutId="tutor-filter"
                                    className="absolute inset-0 rounded-lg"
                                    style={{ background: 'var(--accent-blue)', zIndex: -1 }}
                                    transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                            )}
                            {s}
                        </motion.button>
                    );
                })}
            </div>

            {loading ? (
                <div className="text-center py-16 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
            ) : tutors.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border text-sm"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    No {filter} applications.
                </div>
            ) : (
                <motion.div className="flex flex-col gap-4" variants={stagger(0.06)} initial="hidden" animate="show">
                    {tutors.map(t => (
                        <motion.div key={t.id} variants={fadeUp}
                            className="rounded-2xl p-6 border"
                            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                {/* info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                                        <p className="font-semibold">{t.users.first_name} {t.users.last_name}</p>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                            style={{
                                                background: t.status === 'approved' ? 'rgba(52,211,153,0.12)' : t.status === 'pending' ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.12)',
                                                color: t.status === 'approved' ? '#34d399' : t.status === 'pending' ? '#fbbf24' : '#f87171',
                                            }}>
                                            {t.status}
                                        </span>
                                    </div>
                                    <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t.users.email} · {t.users.university || 'No university'}</p>
                                    <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                                        Applied: {new Date(t.applied_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        {' · '}{Number(t.hourly_rate).toLocaleString()} FCFA/hr
                                        {t.years_experience ? ` · ${t.years_experience} yrs exp` : ''}
                                    </p>

                                    {/* subjects */}
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {t.subjects.map(s => (
                                            <span key={s} className="text-xs px-2.5 py-1 rounded-lg font-medium"
                                                style={{ background: 'rgba(0,102,255,0.08)', color: 'var(--accent-blue)', border: '1px solid rgba(0,102,255,0.15)' }}>
                                                {s}
                                            </span>
                                        ))}
                                    </div>

                                    {/* bio */}
                                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                        {t.bio}
                                    </p>

                                    {/* proof doc */}
                                    {t.proof_document_url && (
                                        <a href={t.proof_document_url} target="_blank" rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold"
                                            style={{ color: 'var(--accent-blue)' }}>
                                            <FileText size={13} /> View proof document
                                        </a>
                                    )}
                                </div>

                                {/* actions */}
                                {t.status === 'pending' && (
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <motion.button whileTap={{ scale: 0.95 }}
                                            onClick={() => updateStatus(t.id, 'approved')}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                                            style={{ background: '#34d399' }}>
                                            <CheckCircle size={15} /> Approve
                                        </motion.button>
                                        <motion.button whileTap={{ scale: 0.95 }}
                                            onClick={() => updateStatus(t.id, 'rejected')}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                                            style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>
                                            <XCircle size={15} /> Reject
                                        </motion.button>
                                    </div>
                                )}
                                {t.status === 'rejected' && (
                                    <motion.button whileTap={{ scale: 0.95 }}
                                        onClick={() => updateStatus(t.id, 'approved')}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0"
                                        style={{ background: '#34d399' }}>
                                        <CheckCircle size={15} /> Approve
                                    </motion.button>
                                )}
                                {t.status === 'approved' && (
                                    <motion.button whileTap={{ scale: 0.95 }}
                                        onClick={() => updateStatus(t.id, 'rejected')}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shrink-0"
                                        style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>
                                        <XCircle size={15} /> Revoke
                                    </motion.button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
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
            <div className="flex gap-1 p-1 rounded-xl border w-fit mb-6"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                {['notes', 'subscriptions'].map(s => {
                    const active = activeSection === s;
                    return (
                        <motion.button key={s} onClick={() => switchSection(s)} whileTap={{ scale: 0.96 }}
                            className="relative px-4 py-1.5 rounded-lg text-sm font-medium capitalize"
                            style={{ color: active ? '#fff' : 'var(--text-secondary)', zIndex: 1 }}>
                            {active && (
                                <motion.span layoutId="premium-section"
                                    className="absolute inset-0 rounded-lg"
                                    style={{ background: '#d97706', zIndex: -1 }}
                                    transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                            )}
                            {s === 'notes' ? '📄 Notes' : '⭐ Subscriptions'}
                        </motion.button>
                    );
                })}
            </div>

            {activeSection === 'notes' && (
                <>
                    {/* revenue summary */}
                    <div className="flex gap-4 mb-6 flex-wrap">
                        <div className="rounded-2xl p-5 border flex items-center gap-4"
                            style={{ background: 'var(--bg-card)', borderColor: 'rgba(251,191,36,0.25)' }}>
                            <Crown size={22} color="#fbbf24" />
                            <div>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Notes</p>
                                <p className="text-2xl font-bold" style={{ color: '#fbbf24' }}>{notes.length}</p>
                            </div>
                        </div>
                        <div className="rounded-2xl p-5 border flex items-center gap-4"
                            style={{ background: 'var(--bg-card)', borderColor: 'rgba(52,211,153,0.25)' }}>
                            <TrendingUp size={22} color="#34d399" />
                            <div>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Est. Revenue</p>
                                <p className="text-2xl font-bold" style={{ color: '#34d399' }}>{totalRevenue.toLocaleString()} FCFA</p>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-16 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
                    ) : notes.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl border text-sm"
                            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                            No premium notes yet.
                        </div>
                    ) : (
                        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-subtle)' }}>
                                            {['Title', 'Subject', 'Price', 'Sales', 'Author', 'Status', 'Actions'].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                                                    style={{ color: 'var(--text-secondary)' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {notes.map((n, i) => (
                                            <tr key={n.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-main)' }}>
                                                <td className="px-4 py-3 font-medium max-w-[180px] truncate">{n.title}</td>
                                                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{n.subject}</td>
                                                <td className="px-4 py-3 font-semibold" style={{ color: '#fbbf24' }}>{Number(n.price).toLocaleString()} FCFA</td>
                                                <td className="px-4 py-3 text-xs">{n._count?.purchased_notes || 0}</td>
                                                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{n.users?.first_name} {n.users?.last_name}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                        style={{ background: n.is_active ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: n.is_active ? '#34d399' : '#f87171' }}>
                                                        {n.is_active ? 'Active' : 'Hidden'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => toggleNote(n.id, n.is_active)}
                                                            className="p-1.5 rounded-lg"
                                                            style={{ background: n.is_active ? 'rgba(251,191,36,0.1)' : 'rgba(52,211,153,0.1)' }}
                                                            title={n.is_active ? 'Hide note' : 'Show note'}>
                                                            {n.is_active ? <ToggleRight size={14} color="#fbbf24" /> : <ToggleLeft size={14} color="#34d399" />}
                                                        </button>
                                                        <button onClick={() => deleteNote(n.id)}
                                                            className="p-1.5 rounded-lg"
                                                            style={{ background: 'rgba(248,113,113,0.1)' }}
                                                            title="Delete note">
                                                            <Trash2 size={14} color="#f87171" />
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
                    <div className="text-center py-16 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
                ) : subs.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl border text-sm"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                        No subscriptions yet.
                    </div>
                ) : (
                    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-subtle)' }}>
                                        {['User', 'Email', 'Status', 'Expires', 'Subscribed'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                                                style={{ color: 'var(--text-secondary)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {subs.map((s, i) => {
                                        const expired = new Date(s.expires_at) < new Date();
                                        return (
                                            <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-main)' }}>
                                                <td className="px-4 py-3 font-medium">{s.users?.first_name} {s.users?.last_name}</td>
                                                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{s.users?.email}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                        style={{ background: !expired ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: !expired ? '#34d399' : '#f87171' }}>
                                                        {!expired ? 'Active' : 'Expired'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    {new Date(s.expires_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
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

    useEffect(() => {
        if (user?.role !== 'admin') { navigate('/dashboard'); return; }
        api.get('/admin/stats').then(({ data }) => setStats(data)).catch(() => {});
    }, [user]);

    if (user?.role !== 'admin') return null;

    return (
        <div className="lg:pl-60" style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
            <main className="pt-20 pb-16 px-4 md:px-8 max-w-6xl mx-auto">

                {/* header */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold gradient-text"
                            style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                            Admin Dashboard
                        </h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                            Manage users, tutors, and platform activity
                        </p>
                    </div>
                    {stats?.tutors?.pending > 0 && (
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                            style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                            <Clock size={15} />
                            {stats.tutors.pending} tutor{stats.tutors.pending > 1 ? 's' : ''} awaiting review
                        </motion.div>
                    )}
                </div>

                {/* tabs */}
                <div className="flex gap-1 p-1 rounded-xl border w-fit mb-8"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                    {TABS.map(t => {
                        const active = tab === t;
                        const icons = { overview: BarChart2, users: Users, tutors: GraduationCap, premium: Crown };
                        const Icon = icons[t];
                        return (
                            <motion.button key={t} onClick={() => setTab(t)} whileTap={{ scale: 0.96 }}
                                className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium capitalize"
                                style={{ color: active ? '#fff' : 'var(--text-secondary)', zIndex: 1 }}>
                                {active && (
                                    <motion.span layoutId="admin-tab"
                                        className="absolute inset-0 rounded-lg"
                                        style={{ background: 'var(--accent-blue)', zIndex: -1 }}
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                                )}
                                <Icon size={15} /> {t}
                            </motion.button>
                        );
                    })}
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
                        {tab === 'premium'  && <PremiumTab />}
                    </motion.div>
                </AnimatePresence>

            </main>
        </div>
    );
}
