import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, FileText, Star, MessageSquare, GraduationCap, ArrowRight, Calendar, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import { TIERS, getRepInfo } from '../lib/tiers';
import { BOOKING_STATUS_TONE, bookingStatusKey } from '../lib/bookingStatus';
import { formatDate, formatNumber } from '../lib/formatDate';

/* ── animation variants ───────────────────────────────────────── */
const stagger = (s = 0.08, d = 0) => ({
    hidden: {},
    show:   { transition: { staggerChildren: s, delayChildren: d } },
});
const cardVariant = {
    hidden: { opacity: 0, y: 20 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};
const tabVariants = {
    enter: dir => ({ opacity: 0, x: dir > 0 ? 24 : -24 }),
    center:      { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
    exit:  dir => ({ opacity: 0, x: dir > 0 ? -24 : 24, transition: { duration: 0.2 } }),
};

function SkeletonCard() {
    return (
        <div className="rounded-2xl p-6 border border-border bg-surface">
            <div className="flex items-center gap-4 mb-4">
                <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                    <Skeleton className="w-3/5 h-3" />
                    <Skeleton className="w-2/5 h-[18px]" />
                </div>
            </div>
            <Skeleton className="w-4/5 h-2.5" />
        </div>
    );
}

/* ── count-up hook ────────────────────────────────────────────── */
function useCountUp(target, duration = 900) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        if (target === 0) return;
        let start = null;
        const tick = ts => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target));
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [target, duration]);
    return val;
}

/* ── activity builder ─────────────────────────────────────────── */
function buildActivity(groups, notes) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const base = days.map(d => ({ day: d, groups: 0, notes: 0 }));
    const dow  = d => { const n = new Date(d).getDay(); return n === 0 ? 6 : n - 1; };
    const week = Date.now() - 7 * 86400000;
    groups.forEach(g => { if (new Date(g.created_at) >= week) base[dow(g.created_at)].groups++; });
    notes.forEach(n  => { if (new Date(n.created_at) >= week) base[dow(n.created_at)].notes++;  });
    return base;
}

/* ── chart tooltip ────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
    const { t } = useTranslation();
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl px-3 py-2 text-xs border border-border bg-surface-raised shadow-lg text-fg">
            <p className="font-semibold mb-1">{t(`days.${label}`, { defaultValue: label })}</p>
            {payload.map(p => <p key={p.name} style={{ color: p.fill }}>{p.name}: {p.value}</p>)}
        </div>
    );
}

/* ── stat card ────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color, sub, reduced }) {
    const count = useCountUp(value);
    const [hovered, setHovered] = useState(false);

    return (
        <motion.div
            variants={reduced ? {} : cardVariant}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            animate={{ y: hovered ? -4 : 0, boxShadow: hovered ? `0 12px 32px ${color}28` : '0 0 0 0 transparent' }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="rounded-2xl p-6 border border-border bg-surface flex items-center gap-4 cursor-default"
        >
            <motion.div
                animate={{ scale: hovered ? 1.12 : 1, rotate: hovered ? 6 : 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}1a` }}
            >
                <Icon size={22} color={color} strokeWidth={1.75} />
            </motion.div>
            <div>
                <p className="text-xs font-medium mb-0.5 text-fg-secondary">{label}</p>
                <p className="text-2xl font-bold tabular-nums" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color }}>{count}</p>
                <p className="text-xs text-fg-secondary">{sub}</p>
            </div>
        </motion.div>
    );
}

/* ── content card ─────────────────────────────────────────────── */
function ContentCard({ item, type }) {
    const { t } = useTranslation();
    const [hovered, setHovered] = useState(false);
    return (
        <motion.div
            variants={cardVariant}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            animate={{
                y: hovered ? -5 : 0,
                boxShadow: hovered ? '0 16px 40px rgba(59,130,246,0.15)' : '0 0 0 0 transparent',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="rounded-2xl p-5 border border-border bg-surface flex flex-col relative"
        >
            {type === 'groups' && item.unreadCount > 0 && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-danger shadow-md"
                >
                    {item.unreadCount > 9 ? '9+' : item.unreadCount}
                </motion.div>
            )}
            <h3 className="font-semibold mb-1.5 text-sm text-fg">{item.name || item.title}</h3>
            <p className="text-xs mb-4 flex-1 line-clamp-2 text-fg-secondary" style={{ lineHeight: 1.7 }}>
                {item.description}
            </p>
            <div className="flex justify-between text-xs mb-4 text-fg-secondary">
                {type === 'groups' && <><span>{t('dashboard.members', { count: item.current_members ?? 0 })}</span><span>{t(`subjectName.${item.subject}`, { defaultValue: item.subject })}</span></>}
                {type === 'notes'  && <><span>{t('dashboard.downloads', { count: item.downloads ?? 0 })}</span><span>{t(`subjectName.${item.subject}`, { defaultValue: item.subject })}</span></>}
            </div>
            <Button to={type === 'groups' ? `/groups/${item.id}/chat` : `/notes/${item.id}`} size="sm" fullWidth>
                {type === 'groups' ? t('dashboard.goToGroup') : t('dashboard.viewNote')}
            </Button>
        </motion.div>
    );
}

/* ── booking card ─────────────────────────────────────────────── */
function BookingCard({ booking }) {
    const { t } = useTranslation();
    const tutor = booking.tutors;
    const tutorName = tutor?.users
        ? `${tutor.users.first_name} ${tutor.users.last_name}`
        : t('dashboard.tutorFallback');
    const tone  = BOOKING_STATUS_TONE[booking.status] ?? 'warning';
    const label = t(bookingStatusKey(booking.status));
    const date = formatDate(booking.session_date, { weekday: 'short', month: 'short', day: 'numeric' });
    const startTime = new Date(booking.start_time).toTimeString().slice(0, 5);
    const endTime   = new Date(booking.end_time).toTimeString().slice(0, 5);

    return (
        <motion.div variants={cardVariant} className="rounded-2xl p-5 border border-border bg-surface flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="font-semibold text-sm text-fg">{tutorName}</p>
                    <p className="text-xs mt-0.5 text-fg-secondary">{t(`subjectName.${booking.subject}`, { defaultValue: booking.subject })}</p>
                </div>
                <Badge tone={tone} className="shrink-0">{label}</Badge>
            </div>
            <div className="flex flex-col gap-1.5 text-xs text-fg-secondary">
                <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {date}
                </span>
                <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {startTime} – {endTime}
                </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="font-bold text-sm text-primary">
                    {formatNumber(booking.total_amount)} FCFA
                </span>
                <Button to={`/tutor/${tutor?.id}`} size="sm">{t('dashboard.viewTutor')}</Button>
            </div>
        </motion.div>
    );
}

/* ── empty state ──────────────────────────────────────────────── */
function EmptyState({ type }) {
    const { t } = useTranslation();
    const map = {
        groups:   { msgKey: 'emptyGroups',   ctaKey: 'emptyGroupsCta',   to: '/groups' },
        notes:    { msgKey: 'emptyNotes',    ctaKey: 'emptyNotesCta',    to: '/notes'  },
        bookings: { msgKey: 'emptyBookings', ctaKey: 'emptyBookingsCta', to: '/tutors' },
    };
    const { msgKey, ctaKey, to } = map[type];
    const msg = t(`dashboard.${msgKey}`);
    const cta = t(`dashboard.${ctaKey}`);
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-16 rounded-2xl border border-border bg-surface"
        >
            <p className="text-sm mb-5 text-fg-secondary">{msg}</p>
            <Button to={to} icon={ArrowRight} iconPosition="right" className="hover:-translate-y-0.5">
                {cta}
            </Button>
        </motion.div>
    );
}

/* ── tabs ─────────────────────────────────────────────────────── */
const TABS = [
    { key: 'groups',   labelKey: 'dashboard.tabGroups'   },
    { key: 'notes',    labelKey: 'dashboard.tabNotes'    },
    { key: 'bookings', labelKey: 'dashboard.tabBookings' },
];

/* ── main ─────────────────────────────────────────────────────── */
export default function Dashboard() {
    const { t }     = useTranslation();
    const { user }  = useAuth();
    const reduced   = useReducedMotion();
    const { tier, next, pct } = getRepInfo(user?.reputation ?? 0);

    const [myGroups,   setMyGroups]   = useState([]);
    const [myNotes,    setMyNotes]    = useState([]);
    const [myBookings, setMyBookings] = useState([]);
    const [isTutor,    setIsTutor]    = useState(false);
    const [activity,   setActivity]   = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [tab,        setTab]        = useState('groups');
    const [tabDir,     setTabDir]     = useState(1);

    const downloads = myNotes.reduce((a, n) => a + (n.downloads || 0), 0);

    useEffect(() => {
        Promise.all([
            api.get('/groups'),
            api.get('/notes'),
            api.get('/tutors/status/me').catch(() => ({ data: { tutor_status: null } })),
            api.get('/tutors/bookings/mine').catch(() => ({ data: [] })),
        ])
            .then(([g, n, t, b]) => {
                const groups = g.data.filter(x => x.created_by === user.id);
                const notes  = n.data.filter(x => x.uploaded_by === user.id);
                setMyGroups(groups);
                setMyNotes(notes);
                setMyBookings(b.data);
                setIsTutor(!!t.data.tutor_status);
                setActivity(buildActivity(groups, notes));
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [user.id]);

    const switchTab = (key) => {
        const cur = TABS.findIndex(x => x.key === tab);
        const nxt = TABS.findIndex(x => x.key === key);
        setTabDir(nxt > cur ? 1 : -1);
        setTab(key);
    };

    const hasActivity = activity.some(d => d.groups + d.notes > 0);

    /* ── skeleton state ─────────────────────────────────────── */
    if (loading) {
        return (
            <div className="lg:pl-60 min-h-screen bg-bg">
                <Sidebar />
                <main className="pt-20 pb-16 px-4 md:px-8 max-w-6xl mx-auto">
                    <div className="rounded-2xl p-7 border border-border bg-surface mb-6">
                        <Skeleton className="w-[45%] h-7 mb-3" />
                        <Skeleton className="w-[30%] h-3.5 mb-6" />
                        <div className="flex gap-3"><Skeleton className="w-[100px] h-[34px] rounded-xl" /><Skeleton className="w-20 h-[34px] rounded-xl" /><Skeleton className="w-[90px] h-[34px] rounded-xl" /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                        {[0,1,2].map(i => <SkeletonCard key={i} />)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                        {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="lg:pl-60 min-h-screen bg-bg">
            <Sidebar />

            <main className="pt-20 pb-16 px-4 md:px-8 max-w-6xl mx-auto">

                {/* ── WELCOME + REPUTATION ──────────────────────── */}
                <motion.div
                    className="grid md:grid-cols-3 gap-5 mb-8"
                    variants={reduced ? {} : stagger(0.1, 0)}
                    initial="hidden" animate="show"
                >
                    {/* welcome */}
                    <motion.div
                        variants={reduced ? {} : cardVariant}
                        className="md:col-span-2 rounded-2xl p-7 border border-border bg-primary-subtle"
                    >
                        <h1 className="text-2xl md:text-3xl font-bold mb-1 gradient-text" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {t('dashboard.greeting', { name: user?.first_name })}
                        </h1>
                        <p className="text-sm mb-5 text-fg-secondary">
                            {user?.university} · {user?.field_of_study}
                        </p>
                        <motion.div
                            className="flex flex-wrap gap-3"
                            variants={reduced ? {} : stagger(0.07, 0.2)}
                            initial="hidden" animate="show"
                        >
                            {[
                                { to: '/groups', icon: Users,         label: t('dashboard.quickGroups') },
                                { to: '/notes',  icon: FileText,      label: t('dashboard.quickNotes')  },
                                { to: '/qa',     icon: MessageSquare, label: t('dashboard.quickQa')     },
                                isTutor
                                    ? { to: '/tutor-dashboard', icon: GraduationCap, label: t('dashboard.tutorPanel')   }
                                    : { to: '/become-tutor',    icon: GraduationCap, label: t('dashboard.becomeTutor')  },
                            ].map(({ to, icon: Icon, label }) => (
                                <motion.div key={to} variants={reduced ? {} : cardVariant}
                                    whileHover={{ scale: 1.04, y: -2 }}
                                    whileTap={{ scale: 0.96 }}
                                    transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                                >
                                    <Link to={to}
                                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border text-fg bg-surface transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                                        <Icon size={14} strokeWidth={2} />{label}
                                    </Link>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>

                    {/* reputation */}
                    <motion.div
                        variants={reduced ? {} : cardVariant}
                        className="rounded-2xl p-6 border border-border bg-surface flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-fg-secondary">{t('dashboard.reputation')}</span>
                            <motion.span
                                className="text-xs font-bold px-2 py-0.5 rounded-full"
                                style={{ background: `${tier.color}22`, color: tier.color }}
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 350, damping: 20, delay: 0.4 }}
                            >
                                {t(`tier.${tier.id}`, { defaultValue: tier.label })}
                            </motion.span>
                        </div>
                        <motion.div
                            className="text-4xl font-bold mb-1 tabular-nums"
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: tier.color }}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.25 }}
                        >
                            {user?.reputation ?? 0}
                        </motion.div>
                        <p className="text-xs mb-3 text-fg-secondary">
                            {next
                                ? t('dashboard.ptsToNext', {
                                    points: next - (user?.reputation ?? 0),
                                    tier: (() => {
                                        const nextTier = TIERS.find(x => x.min === next);
                                        return nextTier ? t(`tier.${nextTier.id}`, { defaultValue: nextTier.label }) : '';
                                    })(),
                                })
                                : t('dashboard.maxTier')}
                        </p>
                        {next && (
                            <div>
                                <div className="h-1.5 rounded-full overflow-hidden bg-border">
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{ background: tier.color }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                                    />
                                </div>
                                <p className="text-xs mt-1 text-right text-fg-secondary">{pct}%</p>
                            </div>
                        )}
                    </motion.div>
                </motion.div>

                {/* ── STAT CARDS ────────────────────────────────── */}
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8"
                    variants={reduced ? {} : stagger(0.09, 0.15)}
                    initial="hidden" animate="show"
                >
                    <StatCard icon={Users}    label={t('dashboard.statGroups')}    value={myGroups.length} color="var(--brand-600)"      sub={t('dashboard.statGroupsSub')}    reduced={reduced} />
                    <StatCard icon={FileText} label={t('dashboard.statNotes')}     value={myNotes.length}  color="var(--status-success)" sub={t('dashboard.statNotesSub')}     reduced={reduced} />
                    <StatCard icon={Star}     label={t('dashboard.statDownloads')} value={downloads}       color="var(--status-warning)" sub={t('dashboard.statDownloadsSub')} reduced={reduced} />
                </motion.div>

                {/* ── ACTIVITY CHART ────────────────────────────── */}
                {hasActivity && (
                    <motion.div
                        className="rounded-2xl p-6 border border-border bg-surface mb-8"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.35 }}
                    >
                        <p className="text-sm font-semibold mb-1 text-fg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {t('dashboard.activityTitle')}
                        </p>
                        <p className="text-xs mb-5 text-fg-secondary">
                            {t('dashboard.activitySub')}
                        </p>
                        <ResponsiveContainer width="100%" height={120}>
                            <BarChart data={activity} barGap={4} barSize={10}>
                                <XAxis
                                    dataKey="day"
                                    tickFormatter={d => t(`days.${d}`, { defaultValue: d })}
                                    tick={{ fontSize: 11, fill: 'var(--ink-secondary)' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis hide />
                                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(128,128,128,0.06)' }} />
                                <Bar dataKey="groups" name={t('dashboard.tabGroups')} radius={[4,4,0,0]} fill="#3b82f6" isAnimationActive animationBegin={300} animationDuration={900} />
                                <Bar dataKey="notes"  name={t('dashboard.tabNotes')}  radius={[4,4,0,0]} fill="#34d399" isAnimationActive animationBegin={450} animationDuration={900} />
                            </BarChart>
                        </ResponsiveContainer>
                    </motion.div>
                )}

                {/* ── MY CONTENT — TABBED ───────────────────────── */}
                <div>
                    <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                        <h2 className="text-lg font-bold text-fg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {t('dashboard.myContent')}
                        </h2>
                        <div className="flex gap-1 p-1 rounded-xl border border-border bg-surface overflow-x-auto max-w-full">
                            {TABS.map(({ key, labelKey }) => {
                                const count = key === 'groups' ? myGroups.length : key === 'notes' ? myNotes.length : myBookings.length;
                                const active = tab === key;
                                return (
                                    <motion.button
                                        key={key}
                                        onClick={() => switchTab(key)}
                                        className={`relative px-4 py-1.5 rounded-lg text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${active ? 'text-white' : 'text-fg-secondary'}`}
                                        style={{ zIndex: 1 }}
                                        whileTap={{ scale: 0.96 }}
                                    >
                                        {active && (
                                            <motion.span
                                                layoutId="tab-pill"
                                                className="absolute inset-0 rounded-lg bg-primary"
                                                style={{ zIndex: -1 }}
                                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                        {t(labelKey)}
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

                    {/* tab content with slide transition */}
                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                        <AnimatePresence mode="wait" custom={tabDir}>
                            <motion.div
                                key={tab}
                                custom={tabDir}
                                variants={tabVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                            >
                                {tab === 'groups' && (
                                    myGroups.length === 0
                                        ? <EmptyState type="groups" />
                                        : <motion.div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                                            variants={stagger(0.07)} initial="hidden" animate="show">
                                            {myGroups.map(item => <ContentCard key={item.id} item={item} type="groups" />)}
                                          </motion.div>
                                )}
                                {tab === 'notes' && (
                                    myNotes.length === 0
                                        ? <EmptyState type="notes" />
                                        : <motion.div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                                            variants={stagger(0.07)} initial="hidden" animate="show">
                                            {myNotes.map(item => <ContentCard key={item.id} item={item} type="notes" />)}
                                          </motion.div>
                                )}
                                {tab === 'bookings' && (
                                    myBookings.length === 0
                                        ? <EmptyState type="bookings" />
                                        : <motion.div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                                            variants={stagger(0.07)} initial="hidden" animate="show">
                                            {myBookings.map(item => <BookingCard key={item.id} booking={item} />)}
                                          </motion.div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

            </main>
        </div>
    );
}
