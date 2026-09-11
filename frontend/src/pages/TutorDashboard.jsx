import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign, Calendar, Clock, Star, CheckCircle,
    XCircle, TrendingUp, BookOpen, ChevronRight, AlertCircle,
    Plus, Trash2, Edit3, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import api, { apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';
import { useTranslation } from 'react-i18next';
import { BOOKING_STATUS_TONE, bookingStatusKey } from '../lib/bookingStatus';
import { formatDate, formatTime, formatNumber } from '../lib/formatDate';

// Stored and sent to the API, so these stay English; `dayFull` supplies labels.
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function AvailabilityManager({ tutorId }) {
    const { t } = useTranslation();
    const [slots, setSlots] = useState([]);
    const [form, setForm] = useState({ dayOfWeek: 'Monday', startTime: '09:00', endTime: '11:00' });
    const [adding, setAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        api.get('/tutors/availability/me').then(r => setSlots(r.data)).catch(() => {});
    }, []);

    const addSlot = async e => {
        e.preventDefault();
        if (form.startTime >= form.endTime) { toast.error(t('tutorDashboard.endAfterStart')); return; }
        setAdding(true);
        try {
            await api.post(`/tutors/${tutorId}/availability`, form);
            const r = await api.get('/tutors/availability/me');
            setSlots(r.data);
            setShowForm(false);
            toast.success(t('tutorDashboard.slotAdded'));
        } catch (err) {
            toast.error(apiError(err, t('tutorDashboard.addSlotFailed')));
        } finally { setAdding(false); }
    };

    const deleteSlot = async id => {
        try {
            await api.delete(`/tutors/availability/${id}`);
            setSlots(prev => prev.filter(s => s.id !== id));
            toast.success(t('tutorDashboard.slotRemoved'));
        } catch { toast.error(t('tutorDashboard.removeSlotFailed')); }
    };

    const fmtSlotTime = value => formatTime(`1970-01-01T${value}`, { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{t('tutorDashboard.availability')}</h2>
                <Button size="sm" icon={Plus} onClick={() => setShowForm(v => !v)}>
                    {t('tutorDashboard.addSlot')}
                </Button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.form onSubmit={addSlot}
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                        className="overflow-hidden mb-5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-border bg-surface-hover">
                            <Field label={t('tutorDashboard.day')} className="mb-0">
                                <Select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}>
                                    {DAYS.map(d => <option key={d} value={d}>{t(`dayFull.${d}`, { defaultValue: d })}</option>)}
                                </Select>
                            </Field>
                            <Field label={t('tutorDashboard.startTime')} className="mb-0">
                                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                            </Field>
                            <Field label={t('tutorDashboard.endTime')} className="mb-0">
                                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                            </Field>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <Button type="submit" disabled={adding} loading={adding} size="sm" icon={adding ? undefined : Save} className="!bg-[image:none] bg-success">
                                {adding ? t('tutorDashboard.savingSlot') : t('tutorDashboard.saveSlot')}
                            </Button>
                            <Button type="button" onClick={() => setShowForm(false)} variant="secondary" size="sm">
                                {t('common.cancel')}
                            </Button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {slots.length === 0 ? (
                <p className="text-sm text-center py-6 text-fg-secondary">{t('tutorDashboard.noAvailability')}</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {slots.map(slot => (
                        <div key={slot.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-surface-hover">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold w-24">{t(`dayFull.${slot.day_of_week}`, { defaultValue: slot.day_of_week })}</span>
                                <span className="text-sm text-fg-secondary">
                                    {fmtSlotTime(slot.start_time.slice(11,16))} – {fmtSlotTime(slot.end_time.slice(11,16))}
                                </span>
                            </div>
                            <button onClick={() => deleteSlot(slot.id)}
                                aria-label={t('tutorDashboard.removeSlot')}
                                className="p-1.5 rounded-lg transition-colors text-fg-secondary hover:bg-danger hover:text-white">
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
    const { t } = useTranslation();
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
            toast.success(t('tutorDashboard.profileUpdated'));
            onSaved();
            setOpen(false);
        } catch (err) {
            toast.error(apiError(err, t('tutorDashboard.saveFailed')));
        } finally { setSaving(false); }
    };

    return (
        <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{t('tutorDashboard.profile')}</h2>
                <Button variant="secondary" size="sm" icon={Edit3} onClick={() => setOpen(v => !v)}>
                    {open ? t('common.cancel') : t('common.edit')}
                </Button>
            </div>
            {!open ? (
                <div className="space-y-2 text-sm text-fg-secondary">
                    <p><span className="font-semibold text-fg">{t('tutorDashboard.rate')}</span> {t('tutorDashboard.perHour', { amount: formatNumber(tutor?.hourly_rate) })}</p>
                    <p><span className="font-semibold text-fg">{t('tutorDashboard.subjects')}</span> {tutor?.subjects?.map(s => t(`subjectName.${s}`, { defaultValue: s })).join(', ')}</p>
                    <p><span className="font-semibold text-fg">{t('tutorDashboard.bio')}</span> {tutor?.bio}</p>
                </div>
            ) : (
                <form onSubmit={save} className="space-y-4">
                    <Field label={t('tutorDashboard.rateLabel')} className="mb-0">
                        <Input type="number" value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))} />
                    </Field>
                    <Field label={t('tutorDashboard.subjectsLabel')} className="mb-0">
                        <Input type="text" value={form.subjects} onChange={e => setForm(f => ({ ...f, subjects: e.target.value }))} />
                    </Field>
                    <Field label={t('tutorDashboard.bioLabel')} className="mb-0">
                        <Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} />
                    </Field>
                    <Button type="submit" disabled={saving} loading={saving} icon={saving ? undefined : Save} size="sm">
                        {saving ? t('profile.saving') : t('profile.saveChanges')}
                    </Button>
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

function fmt(dateStr) {
    return formatDate(dateStr, { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(value) { return new Date(value).toTimeString().slice(0, 5); }

/* ── stat card ────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color, sub }) {
    return (
        <motion.div
            variants={fadeUp}
            className="rounded-2xl p-6 border border-border bg-surface flex items-center gap-4"
        >
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

/* ── booking row ──────────────────────────────────────────────── */
function BookingRow({ booking, onAction }) {
    const { t } = useTranslation();
    const tone = BOOKING_STATUS_TONE[booking.status] ?? 'warning';
    const label = t(bookingStatusKey(booking.status));
    const studentName = booking.users
        ? `${booking.users.first_name} ${booking.users.last_name}`
        : t('tutorDashboard.student');
    const [acting, setActing] = useState(false);

    async function handle(action) {
        setActing(true);
        try {
            await api.patch(`/tutors/bookings/${booking.id}/status`, { status: action });
            toast.success(t('tutorDashboard.bookingAction', { action: t(`bookingStatus.${action}`, { defaultValue: action }) }));
            onAction(booking.id, action);
        } catch {
            toast.error(t('tutorDashboard.actionFailed'));
        } finally {
            setActing(false);
        }
    }

    return (
        <motion.div
            variants={fadeUp}
            layout
            className="rounded-2xl p-5 border border-border bg-surface flex flex-col sm:flex-row sm:items-center gap-4"
        >
            {/* student + subject */}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{studentName}</p>
                <p className="text-xs mt-0.5 truncate text-fg-secondary">{t(`subjectName.${booking.subject}`, { defaultValue: booking.subject })}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-fg-secondary">
                    <span className="flex items-center gap-1"><Calendar size={12} />{fmt(booking.session_date)}</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{fmtTime(booking.start_time)} – {fmtTime(booking.end_time)}</span>
                </div>
            </div>

            {/* amount + status */}
            <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-sm text-primary">
                    {Number(booking.total_amount).toLocaleString()} FCFA
                </span>
                <Badge tone={tone}>{label}</Badge>
            </div>

            {/* actions — only for pending */}
            {booking.status === 'pending' && (
                <div className="flex gap-2 shrink-0">
                    <Button size="sm" disabled={acting} onClick={() => handle('confirmed')} icon={CheckCircle} className="!bg-[image:none] bg-success">
                        Confirm
                    </Button>
                    <Button size="sm" disabled={acting} onClick={() => handle('cancelled')} icon={XCircle} variant="danger" className="!bg-danger-bg !text-danger">
                        Decline
                    </Button>
                </div>
            )}
        </motion.div>
    );
}

/* ── tabs ─────────────────────────────────────────────────────── */
const TABS = ['pending', 'confirmed', 'completed', 'cancelled'];

/* ── main ─────────────────────────────────────────────────────── */
export default function TutorDashboard() {
    const { t } = useTranslation();
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
        <div className="lg:pl-60 flex items-center justify-center min-h-screen bg-bg">
            <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
        </div>
    );

    if (notTutor) return (
        <div className="lg:pl-60 flex flex-col items-center justify-center min-h-screen gap-5 px-4 bg-bg">
            <BookOpen size={40} className="text-fg-secondary" />
            <p className="text-lg font-semibold" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {t('tutorDashboard.notTutorYet')}
            </p>
            <Button to="/become-tutor" size="lg">{t('tutorDashboard.becomeTutor')}</Button>
        </div>
    );

    return (
        <div className="lg:pl-60 min-h-screen bg-bg">
            <main className="pt-20 pb-16 px-4 md:px-8 max-w-6xl mx-auto">

                {/* ── header ── */}
                <motion.div variants={stagger()} initial="hidden" animate="show"
                    className="mb-8">
                    <motion.div variants={fadeUp} className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold gradient-text" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                                {t('tutorDashboard.pageTitle')}
                            </h1>
                            <p className="text-sm mt-1 text-fg-secondary">
                                {tutor?.subjects?.map(s => t(`subjectName.${s}`, { defaultValue: s })).join(', ') || t('tutorDashboard.yourSubjects')}
                                {' · '}{t('tutorDashboard.perHour', { amount: formatNumber(tutor?.hourly_rate) })}
                            </p>
                        </div>
                        <Button to={`/tutor/${tutor?.id}`} variant="secondary" icon={ChevronRight} iconPosition="right">
                            {t('tutorDashboard.viewProfile')}
                        </Button>
                    </motion.div>
                </motion.div>

                {/* ── next session banner ── */}
                <AnimatePresence>
                    {nextSession && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="rounded-2xl p-5 border border-primary/20 bg-primary-subtle mb-6 flex flex-wrap items-center gap-4"
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/15">
                                <Calendar size={20} className="text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">{t('tutorDashboard.nextSession')}</p>
                                <p className="text-xs mt-0.5 text-fg-secondary">
                                    {nextSession.users
                                        ? `${nextSession.users.first_name} ${nextSession.users.last_name}`
                                        : t('tutorDashboard.student')}
                                    {' · '}{t(`subjectName.${nextSession.subject}`, { defaultValue: nextSession.subject })}
                                    {' · '}{fmt(nextSession.session_date)} {t('tutorDashboard.at')} {fmtTime(nextSession.start_time)}
                                </p>
                            </div>
                            <span className="text-sm font-bold text-primary">
                                {formatNumber(nextSession.total_amount)} FCFA
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
                    <StatCard icon={DollarSign}  label={t('tutorDashboard.statEarned')}   value={`${formatNumber(totalEarnings)} FCFA`} color="#34d399" />
                    <StatCard icon={AlertCircle} label={t('tutorDashboard.statPending')}  value={pendingCount}   color="#fbbf24" sub={t('tutorDashboard.statPendingSub')} />
                    <StatCard icon={TrendingUp}  label={t('tutorDashboard.statUpcoming')} value={confirmedCount} color="var(--brand-600)" />
                    <StatCard icon={Star}        label={t('tutorDashboard.statCompleted')} value={completedCount} color="#8b5cf6" sub={t('tutorDashboard.statCompletedSub')} />
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
                        <h2 className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                            {t('tutorDashboard.bookings')}
                        </h2>
                        {/* tab pills */}
                        <div className="flex gap-1 p-1 rounded-xl border border-border bg-surface overflow-x-auto">
                            {TABS.map(status => {
                                const count = bookings.filter(b => b.status === status).length;
                                const active = tab === status;
                                return (
                                    <motion.button
                                        key={status}
                                        onClick={() => setTab(status)}
                                        whileTap={{ scale: 0.96 }}
                                        className={`relative px-4 py-1.5 rounded-lg text-sm font-medium ${active ? 'text-white' : 'text-fg-secondary'}`}
                                        style={{ zIndex: 1 }}
                                    >
                                        {active && (
                                            <motion.span layoutId="tutor-tab"
                                                className="absolute inset-0 rounded-lg bg-primary"
                                                style={{ zIndex: -1 }}
                                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                        {t(`bookingStatus.${status}`, { defaultValue: status })}
                                        {count > 0 && (
                                            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/25' : 'bg-surface-hover'}`}>
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
                                ? <EmptyState icon={AlertCircle} description={t('tutorDashboard.noBookings', { status: t(`bookingStatus.${tab}`, { defaultValue: tab }).toLowerCase() })} />
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
