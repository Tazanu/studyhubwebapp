import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, FileText, Star, MessageSquare, GraduationCap, ArrowRight, Calendar, Clock } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

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

/* ── skeleton shimmer ─────────────────────────────────────────── */
function Skeleton({ w = '100%', h = 20, r = 8, className = '' }) {
    return (
        <div
            className={`skeleton-shimmer ${className}`}
            style={{ width: w, height: h, borderRadius: r, background: 'var(--bg-hover)' }}
        />
    );
}

function SkeletonCard() {
    return (
        <div className="rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-4 mb-4">
                <Skeleton w={44} h={44} r={12} />
                <div className="flex-1 flex flex-col gap-2">
                    <Skeleton w="60%" h={12} />
                    <Skeleton w="40%" h={18} />
                </div>
            </div>
            <Skeleton w="80%" h={10} />
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

/* ── reputation helpers ───────────────────────────────────────── */
const MILESTONES = [100, 250, 500, 1000, 2500];
const TIERS = [
    { label: 'Newcomer', color: '#888',    min: 0    },
    { label: 'Bronze',   color: '#cd7f32', min: 100  },
    { label: 'Silver',   color: '#94a3b8', min: 250  },
    { label: 'Gold',     color: '#fbbf24', min: 500  },
    { label: 'Platinum', color: '#60a5fa', min: 1000 },
    { label: 'Elite',    color: '#8b5cf6', min: 2500 },
];
function getRepInfo(rep) {
    const tier = [...TIERS].reverse().find(t => rep >= t.min) || TIERS[0];
    const next = MILESTONES.find(m => m > rep);
    const prev = MILESTONES.filter(m => m <= rep).at(-1) ?? 0;
    const pct  = next ? Math.round(((rep - prev) / (next - prev)) * 100) : 100;
    return { tier, next, pct };
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
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl px-3 py-2 text-xs border shadow-xl"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
            <p className="font-semibold mb-1">{label}</p>
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
            className="rounded-2xl p-6 border flex items-center gap-4 cursor-default"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
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
                <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                <p className="text-2xl font-bold tabular-nums"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", color }}>{count}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sub}</p>
            </div>
        </motion.div>
    );
}

/* ── content card ─────────────────────────────────────────────── */
function ContentCard({ item, type }) {
    const [hovered, setHovered] = useState(false);
    return (
        <motion.div
            variants={cardVariant}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            animate={{
                y: hovered ? -5 : 0,
                boxShadow: hovered ? '0 16px 40px rgba(0,102,255,0.15)' : '0 0 0 0 transparent',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="rounded-2xl p-5 border flex flex-col relative"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
            {type === 'groups' && item.unreadCount > 0 && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: '#ef4444', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}
                >
                    {item.unreadCount > 9 ? '9+' : item.unreadCount}
                </motion.div>
            )}
            <h3 className="font-semibold mb-1.5 text-sm">{item.name || item.title}</h3>
            <p className="text-xs mb-4 flex-1 line-clamp-2" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {item.description}
            </p>
            <div className="flex justify-between text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                {type === 'groups' && <><span>{item.current_members} members</span><span>{item.subject}</span></>}
                {type === 'notes'  && <><span>{item.downloads} downloads</span><span>{item.subject}</span></>}
            </div>
            <Link
                to={type === 'groups' ? `/groups/${item.id}/chat` : `/notes/${item.id}`}
                className="block text-center text-xs py-2 rounded-lg font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #0052cc, #0066ff)' }}
            >
                {type === 'groups' ? 'Go to Group' : 'View Note'}
            </Link>
        </motion.div>
    );
}

/* ── booking card ─────────────────────────────────────────────── */
const STATUS_STYLES = {
    pending:   { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', label: 'Pending'   },
    confirmed: { bg: 'rgba(52,211,153,0.12)',  color: '#34d399', label: 'Confirmed' },
    completed: { bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa', label: 'Completed' },
    cancelled: { bg: 'rgba(248,113,113,0.12)', color: '#f87171', label: 'Cancelled' },
};

function BookingCard({ booking }) {
    const tutor = booking.tutors;
    const tutorName = tutor?.users
        ? `${tutor.users.first_name} ${tutor.users.last_name}`
        : 'Tutor';
    const status = STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending;
    const date = new Date(booking.session_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const startTime = new Date(booking.start_time).toTimeString().slice(0, 5);
    const endTime   = new Date(booking.end_time).toTimeString().slice(0, 5);

    return (
        <motion.div
            variants={cardVariant}
            className="rounded-2xl p-5 border flex flex-col gap-3"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="font-semibold text-sm">{tutorName}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{booking.subject}</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: status.bg, color: status.color }}>
                    {status.label}
                </span>
            </div>
            <div className="flex flex-col gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {date}
                </span>
                <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {startTime} – {endTime}
                </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-bold text-sm" style={{ color: 'var(--accent-blue)' }}>
                    {Number(booking.total_amount).toLocaleString()} FCFA
                </span>
                <Link to={`/tutor/${tutor?.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg,#0052cc,#0066ff)' }}>
                    View Tutor
                </Link>
            </div>
        </motion.div>
    );
}

/* ── empty state ──────────────────────────────────────────────── */
function EmptyState({ type }) {
    const map = {
        groups:   { msg: "You haven't created any groups yet.",  to: '/groups', cta: 'Browse Groups' },
        notes:    { msg: "You haven't uploaded any notes yet.",  to: '/notes',  cta: 'Upload Notes'  },
        bookings: { msg: "You have no upcoming bookings.",       to: '/tutors', cta: 'Find Tutors'   },
    };
    const { msg, to, cta } = map[type];
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-16 rounded-2xl border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>{msg}</p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to={to}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
                    style={{ background: 'linear-gradient(135deg, #0052cc, #0066ff)' }}>
                    {cta} <ArrowRight size={15} />
                </Link>
            </motion.div>
        </motion.div>
    );
}

/* ── tabs ─────────────────────────────────────────────────────── */
const TABS = [
    { key: 'groups',   label: 'Groups'   },
    { key: 'notes',    label: 'Notes'    },
    { key: 'bookings', label: 'Bookings' },
];

/* ── main ─────────────────────────────────────────────────────── */
export default function Dashboard() {
    const { user }  = useAuth();
    const reduced   = useReducedMotion();
    const { tier, next, pct } = getRepInfo(user?.reputation ?? 0);
    const totalDownloads = 0; // computed after load

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
        const cur = TABS.findIndex(t => t.key === tab);
        const nxt = TABS.findIndex(t => t.key === key);
        setTabDir(nxt > cur ? 1 : -1);
        setTab(key);
    };

    const hasActivity = activity.some(d => d.groups + d.notes > 0);

    /* ── skeleton state ─────────────────────────────────────── */
    if (loading) {
        return (
            <div className="lg:pl-60" style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
                <style>{`.skeleton-shimmer{background:linear-gradient(90deg,var(--bg-hover) 25%,var(--bg-card) 50%,var(--bg-hover) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite}.@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
                <Sidebar />
                <main className="pt-20 pb-16 px-4 md:px-8 max-w-6xl mx-auto">
                    <div className="rounded-2xl p-7 border mb-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                        <Skeleton w="45%" h={28} r={8} className="mb-3" />
                        <Skeleton w="30%" h={14} r={6} className="mb-6" />
                        <div className="flex gap-3"><Skeleton w={100} h={34} r={10} /><Skeleton w={80} h={34} r={10} /><Skeleton w={90} h={34} r={10} /></div>
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
        <div className="lg:pl-60" style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
            {/* shimmer keyframe */}
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}.skeleton-shimmer{background:linear-gradient(90deg,var(--bg-hover) 25%,var(--bg-card) 50%,var(--bg-hover) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite}`}</style>

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
                        className="md:col-span-2 rounded-2xl p-7 border"
                        style={{
                            background: 'linear-gradient(135deg, rgba(0,102,255,0.07) 0%, rgba(139,92,246,0.07) 100%)',
                            borderColor: 'var(--border-subtle)',
                        }}
                    >
                        <h1 className="text-2xl md:text-3xl font-bold mb-1 gradient-text"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            Good to see you, {user?.first_name}
                        </h1>
                        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                            {user?.university} · {user?.field_of_study}
                        </p>
                        <motion.div
                            className="flex flex-wrap gap-3"
                            variants={reduced ? {} : stagger(0.07, 0.2)}
                            initial="hidden" animate="show"
                        >
                            {[
                                { to: '/groups', icon: Users,         label: 'Groups' },
                                { to: '/notes',  icon: FileText,      label: 'Notes'  },
                                { to: '/qa',     icon: MessageSquare, label: 'Q&A'    },
                                isTutor
                                    ? { to: '/tutor-dashboard', icon: GraduationCap, label: 'Tutor Panel'   }
                                    : { to: '/become-tutor',    icon: GraduationCap, label: 'Become Tutor'  },
                            ].map(({ to, icon: Icon, label }) => (
                                <motion.div key={to} variants={reduced ? {} : cardVariant}
                                    whileHover={{ scale: 1.04, y: -2 }}
                                    whileTap={{ scale: 0.96 }}
                                    transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                                >
                                    <Link to={to}
                                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors focus-visible:outline focus-visible:outline-2"
                                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', background: 'var(--bg-card)', outlineColor: 'var(--accent-blue)' }}>
                                        <Icon size={14} strokeWidth={2} />{label}
                                    </Link>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>

                    {/* reputation */}
                    <motion.div
                        variants={reduced ? {} : cardVariant}
                        className="rounded-2xl p-6 border flex flex-col justify-between"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Reputation</span>
                            <motion.span
                                className="text-xs font-bold px-2 py-0.5 rounded-full"
                                style={{ background: `${tier.color}22`, color: tier.color }}
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 350, damping: 20, delay: 0.4 }}
                            >
                                {tier.label}
                            </motion.span>
                        </div>
                        <motion.div
                            className="text-4xl font-bold mb-1 tabular-nums"
                            style={{ fontFamily: "'Space Grotesk', sans-serif", color: tier.color }}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.25 }}
                        >
                            {user?.reputation ?? 0}
                        </motion.div>
                        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                            {next
                                ? `${next - (user?.reputation ?? 0)} pts to ${TIERS.find(t => t.min === next)?.label}`
                                : 'Max tier reached'}
                        </p>
                        {next && (
                            <div>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{ background: tier.color }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                                    />
                                </div>
                                <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-secondary)' }}>{pct}%</p>
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
                    <StatCard icon={Users}    label="My Groups"     value={myGroups.length} color="var(--accent-blue)" sub="groups created"      reduced={reduced} />
                    <StatCard icon={FileText} label="Notes Uploaded" value={myNotes.length}  color="#34d399"           sub="shared with peers"   reduced={reduced} />
                    <StatCard icon={Star}     label="Downloads"      value={downloads}       color="#fbbf24"           sub="total note downloads" reduced={reduced} />
                </motion.div>

                {/* ── ACTIVITY CHART ────────────────────────────── */}
                {hasActivity && (
                    <motion.div
                        className="rounded-2xl p-6 border mb-8"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.35 }}
                    >
                        <p className="text-sm font-semibold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            Activity this week
                        </p>
                        <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
                            Groups created &amp; notes uploaded
                        </p>
                        <ResponsiveContainer width="100%" height={120}>
                            <BarChart data={activity} barGap={4} barSize={10}>
                                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(128,128,128,0.06)' }} />
                                <Bar dataKey="groups" name="Groups" radius={[4,4,0,0]} fill="#0066ff" isAnimationActive animationBegin={300} animationDuration={900} />
                                <Bar dataKey="notes"  name="Notes"  radius={[4,4,0,0]} fill="#34d399" isAnimationActive animationBegin={450} animationDuration={900} />
                            </BarChart>
                        </ResponsiveContainer>
                    </motion.div>
                )}

                {/* ── MY CONTENT — TABBED ───────────────────────── */}
                <div>
                    <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                        <h2 className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            My Content
                        </h2>
                        <div className="flex gap-1 p-1 rounded-xl border overflow-x-auto max-w-full" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                            {TABS.map(({ key, label }) => {
                                const count = key === 'groups' ? myGroups.length : key === 'notes' ? myNotes.length : myBookings.length;
                                const active = tab === key;
                                return (
                                    <motion.button
                                        key={key}
                                        onClick={() => switchTab(key)}
                                        className="relative px-4 py-1.5 rounded-lg text-sm font-medium focus-visible:outline focus-visible:outline-2"
                                        style={{ color: active ? '#fff' : 'var(--text-secondary)', outlineColor: 'var(--accent-blue)', zIndex: 1 }}
                                        whileTap={{ scale: 0.96 }}
                                    >
                                        {active && (
                                            <motion.span
                                                layoutId="tab-pill"
                                                className="absolute inset-0 rounded-lg"
                                                style={{ background: 'var(--accent-blue)', zIndex: -1 }}
                                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                        {label}
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
