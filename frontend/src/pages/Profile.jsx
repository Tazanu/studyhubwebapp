import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, GraduationCap, BookOpen, MapPin, Users, FileText, Star, HelpCircle, MessageSquare, CheckCircle, Camera, X, Trophy, ChevronRight, Download, Award } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

const TIERS = [
    { label: 'Newcomer',    color: '#9ca3af', min: 0,    next: 100,  desc: 'Keep engaging to unlock Explorer status.' },
    { label: 'Explorer',    color: '#60a5fa', min: 100,  next: 250,  desc: 'Contributors can pin resources in groups.' },
    { label: 'Contributor', color: '#34d399', min: 250,  next: 500,  desc: 'Scholars can create premium notes.' },
    { label: 'Scholar',     color: '#8b5cf6', min: 500,  next: 1000, desc: 'Experts get priority tutor matching.' },
    { label: 'Expert',      color: '#f59e0b', min: 1000, next: 2000, desc: 'Masters unlock exclusive community features.' },
    { label: 'Master',      color: null,      min: 2000, next: null,  desc: "You've reached the top tier!" },
];

const FIELDS_OF_STUDY = [
    'Computer Science','Engineering','Medicine','Law','Business','Economics',
    'Mathematics','Physics','Chemistry','Biology','Psychology','Education',
    'Architecture','Arts','Other',
];

function getTier(rep = 0) {
    return [...TIERS].reverse().find(t => rep >= t.min) || TIERS[0];
}

function getInitialsColor(id) {
    const colors = ['#0066ff','#8b5cf6','#34d399','#f59e0b','#f472b6','#06b6d4','#ef4444','#84cc16'];
    return colors[Math.abs(id || 0) % colors.length];
}

const BACKEND = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
function imgUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${BACKEND}${path}`;
}

function Avatar({ src, name, userId, size = 96, isOwn, onUpload }) {
    const [hovered, setHovered] = useState(false);
    const [imgKey, setImgKey] = useState(0);
    const fileRef = useRef();
    const initials = name?.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
    const bg = getInitialsColor(userId);

    const handleFile = async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('profile_picture', file);
        try {
            const { data } = await api.patch('/users/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            onUpload?.(data.user);
            setImgKey(k => k + 1);
            toast.success('Photo updated!');
        } catch { toast.error('Upload failed'); }
    };

    const fullSrc = imgUrl(src);

    return (
        <div
            className="relative rounded-full cursor-pointer"
            style={{ width: size, height: size }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => isOwn && fileRef.current?.click()}
        >
            {fullSrc ? (
                <img key={imgKey} src={fullSrc} alt={name} className="rounded-full object-cover w-full h-full" />
            ) : (
                <div
                    className="rounded-full flex items-center justify-center font-bold text-white w-full h-full"
                    style={{ background: bg, fontSize: size * 0.33 }}
                >
                    {initials}
                </div>
            )}
            {isOwn && hovered && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <Camera size={size * 0.28} color="white" />
                </div>
            )}
            {isOwn && <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />}
        </div>
    );
}

export default function Profile() {
    const { id } = useParams();
    const { user: authUser, refreshUser } = useAuth();
    const navigate = useNavigate();

    const targetId = id ?? authUser?.id;
    const isOwn = !id || String(id) === String(authUser?.id);

    const [profile, setProfile] = useState(null);
    const [stats, setStats]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab]   = useState('questions');
    const [tabData, setTabData]         = useState({ questions: null, notes: null, answers: null });
    const [leaderboard, setLeaderboard] = useState([]);
    const [myRank, setMyRank]           = useState(null);
    const [editOpen, setEditOpen]       = useState(false);
    const [editForm, setEditForm]       = useState({});
    const [saving, setSaving]           = useState(false);

    const tier = getTier(profile?.reputation ?? 0);
    const name = profile ? `${profile.first_name} ${profile.last_name}` : '';
    const joinDate = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : null;

    useEffect(() => {
        if (!targetId) { navigate('/login'); return; }
        api.get(`/users/${targetId}`)
            .then(p => {
                setProfile(p.data);
                setEditForm({
                    firstName: p.data.first_name || '',
                    lastName:  p.data.last_name  || '',
                    university: p.data.university || '',
                    fieldOfStudy: p.data.field_of_study || '',
                    bio: p.data.bio || '',
                });
            })
            .catch(() => setProfile(null))
            .finally(() => setLoading(false));
        api.get(`/users/${targetId}/stats`)
            .then(s => setStats(s.data))
            .catch(() => {});
    }, [targetId]);

    // load default tab on mount
    useEffect(() => {
        if (targetId) loadTab('questions');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetId]);

    useEffect(() => {
        api.get('/users/leaderboard/top')
            .then(r => {
                setLeaderboard(r.data);
                if (authUser) {
                    const idx = r.data.findIndex(u => u.id === authUser.id);
                    if (idx === -1) {
                        // fetch rank separately — approximate from reputation
                        setMyRank(null);
                    }
                }
            })
            .catch(() => {});
    }, []);

    const loadTab = tab => {
        setActiveTab(tab);
        if (tabData[tab] !== null) return;
        const endpoints = {
            questions: `/qa?author_id=${targetId}&limit=20`,
            notes:     `/notes?uploaded_by=${targetId}&limit=20`,
            answers:   `/users/${targetId}/answers`,
        };
        api.get(endpoints[tab])
            .then(r => {
                let items;
                if (tab === 'questions') items = r.data?.questions || [];
                else if (tab === 'notes') items = Array.isArray(r.data) ? r.data : (r.data?.notes || []);
                else items = Array.isArray(r.data) ? r.data : [];
                setTabData(prev => ({ ...prev, [tab]: items }));
            })
            .catch(() => setTabData(prev => ({ ...prev, [tab]: [] })));
    };

    const saveProfile = async () => {
        setSaving(true);
        try {
            const { data } = await api.patch('/users/profile', editForm);
            setProfile(prev => ({ ...prev, ...data.user }));
            setEditOpen(false);
            await refreshUser();
            toast.success('Profile updated!');
        } catch { toast.error('Failed to save'); }
        finally { setSaving(false); }
    };

    return (
        <div className="lg:pl-60" style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
            <Sidebar />

            <main className="pt-20 pb-16 px-4 md:px-8 max-w-5xl mx-auto">

                {loading ? (
                    <HeroSkeleton />
                ) : !profile ? (
                    <div className="text-center py-24" style={{ color: 'var(--text-secondary)' }}>
                        User not found.
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {/* ── HERO CARD ── */}
                        <div
                            className="rounded-2xl border overflow-hidden mb-6"
                            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
                        >
                            {/* banner */}
                            <div
                                className="h-32 w-full"
                                style={{ background: 'linear-gradient(135deg, #0052cc 0%, #8b5cf6 100%)' }}
                            />

                            {/* avatar + info */}
                            <div className="px-6 pb-6">
                                <div className="flex items-end justify-between -mt-12 mb-4">
                                    <div className="ring-4 ring-[var(--bg-card)] rounded-full">
                                        <Avatar
                                            src={profile.profile_picture}
                                            name={name}
                                            userId={profile.id}
                                            size={96}
                                            isOwn={isOwn}
                                            onUpload={u => setProfile(prev => ({ ...prev, ...u }))}
                                        />
                                    </div>

                                    {isOwn && (
                                        <motion.button
                                            whileHover={{ scale: 1.04 }}
                                            whileTap={{ scale: 0.96 }}
                                            onClick={() => setEditOpen(o => !o)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border"
                                            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', background: 'var(--bg-hover)' }}
                                        >
                                            <Edit2 size={14} /> {editOpen ? 'Close' : 'Edit Profile'}
                                        </motion.button>
                                    )}
                                </div>

                                {/* name + tier */}
                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                    <h1
                                        className="text-2xl font-bold"
                                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                    >
                                        {name}
                                    </h1>
                                    <span
                                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                                        style={{ background: `${tier.color}22`, color: tier.color }}
                                    >
                                        {tier.label}
                                    </span>
                                    <span
                                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                        style={{ background: 'rgba(0,102,255,0.1)', color: 'var(--accent-blue)' }}
                                    >
                                        {profile.reputation ?? 0} rep
                                    </span>
                                </div>

                                {/* meta */}
                                <div className="flex flex-wrap gap-4 text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                                    {profile.university && (
                                        <span className="flex items-center gap-1.5">
                                            <MapPin size={13} /> {profile.university}
                                        </span>
                                    )}
                                    {profile.field_of_study && (
                                        <span className="flex items-center gap-1.5">
                                            <BookOpen size={13} /> {profile.field_of_study}
                                        </span>
                                    )}
                                    {profile.tutors?.status === 'approved' && (
                                        <span className="flex items-center gap-1.5">
                                            <GraduationCap size={13} /> Tutor
                                        </span>
                                    )}
                                    {joinDate && (
                                        <span style={{ color: 'var(--text-muted)' }}>Member since {joinDate}</span>
                                    )}
                                </div>

                                {/* bio */}
                                {profile.bio ? (
                                    <p className="text-sm leading-relaxed max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
                                        {profile.bio}
                                    </p>
                                ) : isOwn && (
                                    <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                                        No bio yet. Add one to let others know who you are.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* ── STATS ROW ── */}
                        {stats && <StatsRow stats={stats} />}

                        {/* ── REPUTATION TIER ── */}
                        {profile && <ReputationCard reputation={profile.reputation ?? 0} />}

                        {/* ── ACTIVITY TABS ── */}
                        <ActivityTabs
                            activeTab={activeTab}
                            tabData={tabData}
                            onTab={loadTab}
                            isOwn={isOwn}
                        />

                        {/* ── LEADERBOARD ── */}
                        <LeaderboardWidget
                            list={leaderboard}
                            currentUserId={authUser?.id}
                            myRank={myRank}
                        />

                        {/* ── EDIT FORM ── */}
                        <AnimatePresence>
                            {editOpen && isOwn && (
                                <EditForm
                                    form={editForm}
                                    onChange={setEditForm}
                                    onSave={saveProfile}
                                    onCancel={() => setEditOpen(false)}
                                    saving={saving}
                                />
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </main>
        </div>
    );
}

function useCountUp(target, duration = 900) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        if (!target) return;
        let start = null;
        const tick = ts => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target));
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [target]);
    return val;
}

const STAT_ITEMS = [
    { key: 'groupsJoined',    label: 'Groups',           icon: Users,         color: '#0066ff' },
    { key: 'notesUploaded',   label: 'Notes',            icon: FileText,      color: '#34d399' },
    { key: 'totalDownloads',  label: 'Downloads',        icon: Star,          color: '#fbbf24' },
    { key: 'questionsAsked',  label: 'Questions',        icon: HelpCircle,    color: '#f472b6' },
    { key: 'answersGiven',    label: 'Answers',          icon: MessageSquare, color: '#a78bfa' },
    { key: 'acceptedAnswers', label: 'Accepted',         icon: CheckCircle,   color: '#34d399' },
];

function StatPill({ icon: Icon, label, value, color }) {
    const count = useCountUp(value);
    const [hovered, setHovered] = useState(false);
    return (
        <motion.div
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            animate={{ y: hovered ? -3 : 0, boxShadow: hovered ? `0 8px 24px ${color}28` : 'none' }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
            className="flex flex-col items-center gap-2 rounded-2xl border p-4 cursor-default"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', flex: '1 1 0' }}
        >
            <motion.div
                animate={{ scale: hovered ? 1.15 : 1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${color}1a` }}
            >
                <Icon size={18} color={color} strokeWidth={1.75} />
            </motion.div>
            <span className="text-xl font-bold tabular-nums" style={{ fontFamily: "'Space Grotesk',sans-serif", color }}>
                {count}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        </motion.div>
    );
}

function StatsRow({ stats }) {
    return (
        <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        >
            {STAT_ITEMS.map(({ key, label, icon, color }) => (
                <motion.div
                    key={key}
                    variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22,1,0.36,1] } } }}
                >
                    <StatPill icon={icon} label={label} value={stats[key] ?? 0} color={color} />
                </motion.div>
            ))}
        </motion.div>
    );
}

function HeroSkeleton() {
    return (
        <div className="rounded-2xl border overflow-hidden mb-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
            <div className="h-32 w-full" style={{ background: 'var(--bg-hover)' }} />
            <div className="px-6 pb-6">
                <div className="flex items-end justify-between -mt-12 mb-4">
                    <div className="w-24 h-24 rounded-full" style={{ background: 'var(--bg-hover)' }} />
                    <div className="w-28 h-9 rounded-xl" style={{ background: 'var(--bg-hover)' }} />
                </div>
                <div className="w-48 h-6 rounded-lg mb-3" style={{ background: 'var(--bg-hover)' }} />
                <div className="w-72 h-4 rounded-lg mb-4" style={{ background: 'var(--bg-hover)' }} />
                <div className="w-full max-w-md h-4 rounded-lg" style={{ background: 'var(--bg-hover)' }} />
            </div>
        </div>
    );
}

// ── REPUTATION CARD ──────────────────────────────────────────────
function ReputationCard({ reputation }) {
    const tier = getTier(reputation);
    const tierIdx = TIERS.findIndex(t => t.label === tier.label);
    const next = TIERS[tierIdx + 1];
    const progress = next
        ? Math.round(((reputation - tier.min) / (next.min - tier.min)) * 100)
        : 100;
    const isMaster = tier.label === 'Master';

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border p-5 mb-6"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: isMaster ? 'linear-gradient(135deg,#0052cc,#8b5cf6)' : `${tier.color}22` }}>
                        <Trophy size={20} color={isMaster ? '#fff' : tier.color} />
                    </div>
                    <div>
                        <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                            Reputation Level
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {tier.desc}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className="text-sm font-bold px-3 py-1 rounded-full"
                        style={isMaster
                            ? { background: 'linear-gradient(135deg,#0052cc,#8b5cf6)', color: '#fff' }
                            : { background: `${tier.color}22`, color: tier.color }}
                    >
                        {tier.label}
                    </span>
                    <span className="text-2xl font-bold tabular-nums" style={{ fontFamily: "'Space Grotesk',sans-serif", color: tier.color || 'var(--accent-blue)' }}>
                        {reputation}
                    </span>
                </div>
            </div>
            {!isMaster && next && (
                <>
                    <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <span>{reputation} / {next.min} to {next.label}</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                        <motion.div
                            className="h-full rounded-full"
                            style={{ background: tier.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        />
                    </div>
                </>
            )}
        </motion.div>
    );
}

// ── ACTIVITY TABS ────────────────────────────────────────────────
const TABS = [
    { key: 'questions', label: 'Questions' },
    { key: 'notes',     label: 'Notes'     },
    { key: 'answers',   label: 'Answers'   },
];

const EMPTY_MSGS = {
    questions: { msg: 'No questions yet.', cta: 'Ask your first question →', to: '/qa' },
    notes:     { msg: 'No notes uploaded yet.', cta: 'Upload a note →', to: '/notes' },
    answers:   { msg: 'No answers yet.', cta: 'Browse questions →', to: '/qa' },
};

function ActivityTabs({ activeTab, tabData, onTab, isOwn }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-2xl border mb-6 overflow-hidden"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
            {/* tab bar */}
            <div className="flex border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => onTab(t.key)}
                        className="flex-1 py-3 text-sm font-semibold transition-colors"
                        style={{
                            color: activeTab === t.key ? 'var(--accent-blue)' : 'var(--text-secondary)',
                            borderBottom: activeTab === t.key ? '2px solid var(--accent-blue)' : '2px solid transparent',
                            background: 'none',
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* content */}
            <div className="p-4">
                {tabData[activeTab] === null ? (
                    <div className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading…</div>
                ) : tabData[activeTab].length === 0 ? (
                    <div className="py-10 text-center">
                        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                            {EMPTY_MSGS[activeTab].msg}
                        </p>
                        {isOwn && (
                            <Link
                                to={EMPTY_MSGS[activeTab].to}
                                className="text-sm font-semibold"
                                style={{ color: 'var(--accent-blue)' }}
                            >
                                {EMPTY_MSGS[activeTab].cta}
                            </Link>
                        )}
                    </div>
                ) : (
                    <ul className="divide-y" style={{ '--tw-divide-opacity': 1, borderColor: 'var(--border-subtle)' }}>
                        {tabData[activeTab].map(item => (
                            <TabItem key={item.id} item={item} tab={activeTab} />
                        ))}
                    </ul>
                )}
            </div>
        </motion.div>
    );
}

function TabItem({ item, tab }) {
    if (tab === 'questions') {
        return (
            <li className="py-3">
                <Link to={`/qa/${item.id}`} className="block group">
                    <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-medium group-hover:underline" style={{ color: 'var(--text-primary)' }}>
                            {item.title}
                        </span>
                        <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                            {item.vote_count ?? 0} votes · {item.answer_count ?? 0} answers
                        </span>
                    </div>
                    {item.subject && (
                        <span className="text-xs mt-0.5 inline-block" style={{ color: 'var(--text-secondary)' }}>{item.subject}</span>
                    )}
                </Link>
            </li>
        );
    }
    if (tab === 'notes') {
        return (
            <li className="py-3">
                <Link to={`/notes/${item.id}`} className="block group">
                    <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-medium group-hover:underline" style={{ color: 'var(--text-primary)' }}>
                            {item.title}
                        </span>
                        <span className="text-xs shrink-0 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            <Download size={11} /> {item.downloads ?? 0}
                        </span>
                    </div>
                    {item.subject && (
                        <span className="text-xs mt-0.5 inline-block" style={{ color: 'var(--text-secondary)' }}>{item.subject}</span>
                    )}
                </Link>
            </li>
        );
    }
    // answers
    return (
        <li className="py-3">
            <Link to={`/qa/${item.question_id}`} className="block group">
                <p className="text-sm line-clamp-2 group-hover:underline" style={{ color: 'var(--text-primary)' }}>
                    {item.content}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    {item.is_accepted && (
                        <span className="text-xs font-semibold" style={{ color: '#34d399' }}>✓ Accepted</span>
                    )}
                    {item.questions?.title && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>on: {item.questions.title}</span>
                    )}
                </div>
            </Link>
        </li>
    );
}

// ── LEADERBOARD WIDGET ───────────────────────────────────────────
function LeaderboardWidget({ list, currentUserId, myRank }) {
    if (!list.length) return null;
    const maxRep = list[0]?.reputation || 1;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl border p-5 mb-6"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
            <div className="flex items-center gap-2 mb-4">
                <Award size={18} color="var(--accent-blue)" />
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Top Contributors</h2>
            </div>
            <ul className="space-y-2">
                {list.map((u, i) => {
                    const isMe = u.id === currentUserId;
                    const initials = `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase();
                    const barW = Math.round((u.reputation / maxRep) * 100);
                    return (
                        <li
                            key={u.id}
                            className="flex items-center gap-3 rounded-xl px-3 py-2"
                            style={{ background: isMe ? 'rgba(0,102,255,0.08)' : 'transparent', border: isMe ? '1px solid rgba(0,102,255,0.2)' : '1px solid transparent' }}
                        >
                            <span className="text-xs font-bold w-5 text-center tabular-nums" style={{ color: 'var(--text-muted)' }}>
                                {i + 1}
                            </span>
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                style={{ background: getInitialsColor(u.id) }}
                            >
                                {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                        {u.first_name} {u.last_name}
                                    </span>
                                    <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: 'var(--accent-blue)' }}>
                                        {u.reputation}
                                    </span>
                                </div>
                                <div className="w-full h-1 rounded-full mt-1 overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                                    <div className="h-full rounded-full" style={{ width: `${barW}%`, background: 'var(--accent-blue)', opacity: 0.6 }} />
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
            {myRank && (
                <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                    You are ranked #{myRank}
                </p>
            )}
        </motion.div>
    );
}

// ── EDIT FORM ────────────────────────────────────────────────────
function EditForm({ form, onChange, onSave, onCancel, saving }) {
    const set = (k, v) => onChange(prev => ({ ...prev, [k]: v }));
    const bioLen = form.bio?.length || 0;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
        >
            <div
                className="rounded-2xl border p-6 mb-6"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Edit Profile</h2>
                    <button onClick={onCancel} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {[['firstName','First name'],['lastName','Last name'],['university','University']].map(([k, label]) => (
                        <div key={k}>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                            <input
                                value={form[k] || ''}
                                onChange={e => set(k, e.target.value)}
                                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
                                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    ))}
                    <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Field of study</label>
                        <select
                            value={form.fieldOfStudy || ''}
                            onChange={e => set('fieldOfStudy', e.target.value)}
                            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
                            style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                        >
                            <option value="">Select…</option>
                            {FIELDS_OF_STUDY.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                </div>

                <div className="mb-5">
                    <div className="flex justify-between mb-1.5">
                        <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Bio</label>
                        <span className="text-xs" style={{ color: bioLen > 280 ? '#ef4444' : 'var(--text-muted)' }}>{bioLen}/300</span>
                    </div>
                    <textarea
                        value={form.bio || ''}
                        onChange={e => set('bio', e.target.value.slice(0, 300))}
                        rows={3}
                        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
                        style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl text-sm border"
                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)', background: 'none' }}
                    >
                        Cancel
                    </button>
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onSave}
                        disabled={saving}
                        className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg,#0052cc,#0066ff)', opacity: saving ? 0.7 : 1 }}
                    >
                        {saving ? 'Saving…' : 'Save changes'}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}
