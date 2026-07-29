import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign, Calendar, Clock, Users, Star, CheckCircle,
    XCircle, TrendingUp, BookOpen, ChevronRight, AlertCircle,
    Plus, Trash2, Edit3, Save, X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function AvailabilityManager({ tutorId }) {
    const [slots, setSlots] = useState([]);
    const [form, setForm] = useState({ dayOfWeek: 'Monday', startTime: '09:00', endTime: '11:00' });
    const [adding, setAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        api.get('/tutors/availability/me').then(r => setSlots(r.data)).catch(() => {});
    }, []);

    const addSlot = async e => {
        e.preventDefault();
        if (form.startTime >= form.endTime) { toast.error('End time must be after start time'); return; }
        setAdding(true);
        try {
            await api.post(`/tutors/${tutorId}/availability`, form);
            const r = await api.get('/tutors/availability/me');
            setSlots(r.data);
            setShowForm(false);
            toast.success('Availability added!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add slot');
        } finally { setAdding(false); }
    };

    const deleteSlot = async id => {
        try {
            await api.delete(`/tutors/availability/${id}`);
            setSlots(prev => prev.filter(s => s.id !== id));
            toast.success('Slot removed');
        } catch { toast.error('Failed to remove slot'); }
    };

    const fmtSlotTime = t => new Date(`1970-01-01T${t}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Availability</h2>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowForm(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
                    style={{ background: 'var(--accent-blue)' }}>
                    <Plus size={14} /> Add Slot
                </motion.button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.form onSubmit={addSlot}
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                        className="overflow-hidden mb-5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border"
                            style={{ background: 'var(--bg-hover)', borderColor: 'var(--border-subtle)' }}>
                            <div>
                                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Day</label>
                                <select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border text-sm"
                                    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Start Time</label>
                                <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border text-sm"
                                    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>End Time</label>
                                <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border text-sm"
                                    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button type="submit" disabled={adding}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                                style={{ background: '#34d399' }}>
                                <Save size={13} /> {adding ? 'Saving…' : 'Save Slot'}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)}
                                className="px-4 py-2 rounded-lg text-sm border"
                                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                Cancel
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {slots.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: 'var(--text-secondary)' }}>No availability set. Add slots so students can book you.</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {slots.map(slot => (
                        <div key={slot.id} className="flex items-center justify-between px-4 py-3 rounded-xl border"
                            style={{ background: 'var(--bg-hover)', borderColor: 'var(--border-subtle)' }}>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold w-24">{slot.day_of_week}</span>
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    {fmtSlotTime(slot.start_time.slice(11,16))} – {fmtSlotTime(slot.end_time.slice(11,16))}
                                </span>
                            </div>
                            <button onClick={() => deleteSlot(slot.id)}
                                className="p-1.5 rounded-lg transition-colors hover:bg-red-500 hover:text-white"
                                style={{ color: 'var(--text-secondary)' }}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ProfileEditor({ tutor, onSaved }) {
    const [form, setForm] = useState({
        bio: tutor?.bio || '',
        hourlyRate: tutor?.hourly_rate || '',
        subjects: tutor?.subjects?.join(', ') || '',
    });
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState(false);

    const save = async e => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch('/tutors/me', {
                bio: form.bio,
                hourlyRate: Number(form.hourlyRate),
                subjects: form.subjects.split(',').map(s => s.trim()).filter(Boolean),
            });
            toast.success('Profile updated!');
            onSaved();
            setOpen(false);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save');
        } finally { setSaving(false); }
    };

    return (
        <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Tutor Profile</h2>
                <button onClick={() => setOpen(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                    <Edit3 size={13} /> {open ? 'Cancel' : 'Edit'}
                </button>
            </div>
            {!open ? (
                <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Rate:</span> {Number(tutor?.hourly_rate).toLocaleString()} FCFA/hr</p>
                    <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Subjects:</span> {tutor?.subjects?.join(', ')}</p>
                    <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Bio:</span> {tutor?.bio}</p>
                </div>
            ) : (
                <form onSubmit={save} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Hourly Rate (FCFA)</label>
                        <input type="number" value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl border text-sm"
                            style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Subjects (comma-separated)</label>
                        <input type="text" value={form.subjects} onChange={e => setForm(f => ({ ...f, subjects: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl border text-sm"
                            style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Bio</label>
                        <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                            rows={3} className="w-full px-3 py-2 rounded-xl border text-sm resize-none"
                            style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                    </div>
                    <button type="submit" disabled={saving}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg,#0052cc,#0066ff)' }}>
                        <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </form>
            )}
        </div>
    );
}

/* ── variants ─────────────────────────────────────────────────── */
const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = (s = 0.08) => ({ hidden: {}, show: { transition: { staggerChildren: s } } });

/* ── helpers ──────────────────────────────────────────────────── */
const STATUS = {
    pending:   { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', label: 'Pending'   },
    confirmed: { bg: 'rgba(52,211,153,0.12)',  color: '#34d399', label: 'Confirmed' },
    completed: { bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa', label: 'Completed' },
    cancelled: { bg: 'rgba(248,113,113,0.12)', color: '#f87171', label: 'Cancelled' },
};

function fmt(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(t) { return new Date(t).toTimeString().slice(0, 5); }

/* ── stat card ────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color, sub }) {
    return (
        <motion.div
            variants={fadeUp}
            className="rounded-2xl p-6 border flex items-center gap-4"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
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

/* ── booking row ──────────────────────────────────────────────── */
function BookingRow({ booking, onAction }) {
    const s = STATUS[booking.status] ?? STATUS.pending;
    const studentName = booking.users
        ? `${booking.users.first_name} ${booking.users.last_name}`
        : 'Student';
    const [acting, setActing] = useState(false);

    async function handle(action) {
        setActing(true);
        try {
            await api.patch(`/tutors/bookings/${booking.id}/status`, { status: action });
            toast.success(`Booking ${action}`);
            onAction(booking.id, action);
        } catch {
            toast.error('Action failed');
        } finally {
            setActing(false);
        }
    }

    return (
        <motion.div
            variants={fadeUp}
            layout
            className="rounded-2xl p-5 border flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
            {/* student + subject */}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{studentName}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{booking.subject}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="flex items-center gap-1"><Calendar size={12} />{fmt(booking.session_date)}</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{fmtTime(booking.start_time)} – {fmtTime(booking.end_time)}</span>
                </div>
            </div>

            {/* amount + status */}
            <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-sm" style={{ color: 'var(--accent-blue)' }}>
                    {Number(booking.total_amount).toLocaleString()} FCFA
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: s.bg, color: s.color }}>{s.label}</span>
            </div>

            {/* actions — only for pending */}
            {booking.status === 'pending' && (
                <div className="flex gap-2 shrink-0">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={acting}
                        onClick={() => handle('confirmed')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                        style={{ background: '#34d399', opacity: acting ? 0.6 : 1 }}
                    >
                        <CheckCircle size={13} /> Confirm
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={acting}
                        onClick={() => handle('cancelled')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', opacity: acting ? 0.6 : 1 }}
                    >
                        <XCircle size={13} /> Decline
                    </motion.button>
                </div>
            )}
        </motion.div>
    );
}

/* ── empty ────────────────────────────────────────────────────── */
function Empty({ msg }) {
    return (
        <div className="text-center py-12 rounded-2xl border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <AlertCircle size={28} className="mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{msg}</p>
        </div>
    );
}

/* ── tabs ─────────────────────────────────────────────────────── */
const TABS = ['pending', 'confirmed', 'completed', 'cancelled'];

/* ── main ─────────────────────────────────────────────────────── */
export default function TutorDashboard() {
    const { user } = useAuth();
    const [tutor,    setTutor]    = useState(null);
    const [bookings, setBookings] = useState([]);
    const [tab,      setTab]      = useState('pending');
    const [loading,  setLoading]  = useState(true);
    const [notTutor, setNotTutor] = useState(false);

    useEffect(() => {
        Promise.all([
            api.get('/tutors/status/me'),
            api.get('/tutors/bookings/tutor').catch(() => ({ data: [] })),
        ]).then(([s, b]) => {
            if (!s.data.tutor_status) { setNotTutor(true); return; }
            // fetch full tutor record (works for approved; for pending, subjects/rate may be available)
            api.get(`/tutors?all=1`).then(({ data }) => {
                const me = data.find(x => x.user_id === user.id);
                setTutor(me ?? { status: s.data.tutor_status });
            }).catch(() => setTutor({ status: s.data.tutor_status }));
            setBookings(b.data);
        }).catch(() => {})
          .finally(() => setLoading(false));
    }, [user.id]);

    function handleAction(id, newStatus) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
    }

    /* ── stats ── */
    const totalEarnings  = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + Number(b.total_amount), 0);
    const pendingCount   = bookings.filter(b => b.status === 'pending').length;
    const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
    const completedCount = bookings.filter(b => b.status === 'completed').length;

    const filtered = bookings.filter(b => b.status === tab);

    /* ── next session ── */
    const nextSession = bookings
        .filter(b => b.status === 'confirmed' && new Date(b.session_date) >= new Date())
        .sort((a, b) => new Date(a.session_date) - new Date(b.session_date))[0];

    if (loading) return (
        <div className="lg:pl-60 flex items-center justify-center min-h-screen"
            style={{ background: 'var(--bg-main)' }}>
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
        </div>
    );

    if (notTutor) return (
        <div className="lg:pl-60 flex flex-col items-center justify-center min-h-screen gap-5 px-4"
            style={{ background: 'var(--bg-main)' }}>
            <BookOpen size={40} style={{ color: 'var(--text-secondary)' }} />
            <p className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                You're not a tutor yet
            </p>
            <Link to="/become-tutor"
                className="px-6 py-3 rounded-xl font-semibold text-white text-sm"
                style={{ background: 'linear-gradient(135deg,#0052cc,#0066ff)' }}>
                Become a Tutor
            </Link>
        </div>
    );

    return (
        <div className="lg:pl-60" style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
            <main className="pt-20 pb-16 px-4 md:px-8 max-w-6xl mx-auto">

                {/* ── header ── */}
                <motion.div variants={stagger()} initial="hidden" animate="show"
                    className="mb-8">
                    <motion.div variants={fadeUp} className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold gradient-text"
                                style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                                Tutor Dashboard
                            </h1>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                                {tutor?.subjects?.join(', ') || 'Your subjects'} · {tutor?.hourly_rate} FCFA/hr
                            </p>
                        </div>
                        <Link to={`/tutor/${tutor?.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors"
                            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', background: 'var(--bg-card)' }}>
                            View Profile <ChevronRight size={15} />
                        </Link>
                    </motion.div>
                </motion.div>

                {/* ── next session banner ── */}
                <AnimatePresence>
                    {nextSession && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="rounded-2xl p-5 border mb-6 flex flex-wrap items-center gap-4"
                            style={{ background: 'rgba(0,102,255,0.07)', borderColor: 'rgba(0,102,255,0.2)' }}
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(0,102,255,0.15)' }}>
                                <Calendar size={20} color="var(--accent-blue)" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">Next session</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                    {nextSession.users
                                        ? `${nextSession.users.first_name} ${nextSession.users.last_name}`
                                        : 'Student'} · {nextSession.subject} · {fmt(nextSession.session_date)} at {fmtTime(nextSession.start_time)}
                                </p>
                            </div>
                            <span className="text-sm font-bold" style={{ color: 'var(--accent-blue)' }}>
                                {Number(nextSession.total_amount).toLocaleString()} FCFA
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── stats ── */}
                <motion.div
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                    variants={stagger(0.07)}
                    initial="hidden" animate="show"
                >
                    <StatCard icon={DollarSign}  label="Total Earned"      value={`${totalEarnings.toLocaleString()} FCFA`} color="#34d399" />
                    <StatCard icon={AlertCircle} label="Pending Requests"  value={pendingCount}   color="#fbbf24" sub="need action" />
                    <StatCard icon={TrendingUp}  label="Upcoming Sessions" value={confirmedCount} color="var(--accent-blue)" />
                    <StatCard icon={Star}        label="Completed"         value={completedCount} color="#8b5cf6" sub="sessions" />
                </motion.div>

                {/* ── profile + availability ── */}
                {tutor && tutor.status === 'approved' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <ProfileEditor tutor={tutor} onSaved={() =>
                            api.get(`/tutors?all=1`).then(({ data }) => {
                                const me = data.find(x => x.user_id === user.id);
                                if (me) setTutor(me);
                            }).catch(() => {})
                        } />
                        <AvailabilityManager tutorId={tutor.id} />
                    </div>
                )}

                {/* ── bookings ── */}
                <div>
                    <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                        <h2 className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                            Bookings
                        </h2>
                        {/* tab pills */}
                        <div className="flex gap-1 p-1 rounded-xl border overflow-x-auto"
                            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                            {TABS.map(t => {
                                const count = bookings.filter(b => b.status === t).length;
                                const active = tab === t;
                                return (
                                    <motion.button
                                        key={t}
                                        onClick={() => setTab(t)}
                                        whileTap={{ scale: 0.96 }}
                                        className="relative px-4 py-1.5 rounded-lg text-sm font-medium capitalize"
                                        style={{ color: active ? '#fff' : 'var(--text-secondary)', zIndex: 1 }}
                                    >
                                        {active && (
                                            <motion.span layoutId="tutor-tab"
                                                className="absolute inset-0 rounded-lg"
                                                style={{ background: 'var(--accent-blue)', zIndex: -1 }}
                                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                        {t}
                                        {count > 0 && (
                                            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                                                style={{ background: active ? 'rgba(255,255,255,0.25)' : 'var(--bg-hover)' }}>
                                                {count}
                                            </span>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={tab}
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: 0.25 }}
                        >
                            {filtered.length === 0
                                ? <Empty msg={`No ${tab} bookings.`} />
                                : (
                                    <motion.div className="flex flex-col gap-3"
                                        variants={stagger(0.06)} initial="hidden" animate="show">
                                        {filtered.map(b => (
                                            <BookingRow key={b.id} booking={b} onAction={handleAction} />
                                        ))}
                                    </motion.div>
                                )
                            }
                        </motion.div>
                    </AnimatePresence>
                </div>

            </main>
        </div>
    );
}
