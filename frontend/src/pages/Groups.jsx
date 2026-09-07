import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Search, Plus, Users, UserCheck, SearchX,
    Laptop2, Calculator, FlaskConical, Cog, Briefcase,
    Scale, TrendingUp, Dna, Atom, WifiOff, Clock } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import MembersModal from '../components/MembersModal';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import InlineConfirm from '../components/ui/InlineConfirm';
import { useInlineConfirm } from '../hooks/useInlineConfirm';

/* ── banner config — deliberate per-subject color coding for scanability across a grid ── */
const BANNERS = {
    'computer science': { gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',  glow: '#3b82f6', Icon: Laptop2      },
    'mathematics':      { gradient: 'linear-gradient(135deg,#10b981,#047857)',  glow: '#10b981', Icon: Calculator   },
    'physics':          { gradient: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',  glow: '#8b5cf6', Icon: Atom         },
    'chemistry':        { gradient: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',  glow: '#8b5cf6', Icon: FlaskConical },
    'engineering':      { gradient: 'linear-gradient(135deg,#f59e0b,#d97706)',  glow: '#f59e0b', Icon: Cog          },
    'business':         { gradient: 'linear-gradient(135deg,#ec4899,#db2777)',  glow: '#ec4899', Icon: Briefcase    },
    'biology':          { gradient: 'linear-gradient(135deg,#34d399,#059669)',  glow: '#34d399', Icon: Dna          },
    'economics':        { gradient: 'linear-gradient(135deg,#f59e0b,#b45309)',  glow: '#f59e0b', Icon: TrendingUp   },
    'law':              { gradient: 'linear-gradient(135deg,#94a3b8,#475569)',  glow: '#94a3b8', Icon: Scale        },
};
const DEFAULT_BANNER = { gradient: 'linear-gradient(135deg,#64748b,#475569)', glow: '#64748b', Icon: Users };
const getBanner = s => {
    const k = (s || '').toLowerCase();
    return Object.entries(BANNERS).find(([key]) => k.includes(key))?.[1] ?? DEFAULT_BANNER;
};

/* ── card variants ────────────────────────────────────────────── */
const cardVariant = {
    hidden: { opacity: 0, y: 20 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22,1,0.36,1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

/* ── main ─────────────────────────────────────────────────────── */
export default function Groups() {
    const { user } = useAuth();
    const navigate  = useNavigate();
    const isOnline = useOnlineStatus();

    const [groups,        setGroups]        = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [search,        setSearch]        = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [showModal,     setShowModal]     = useState(false);
    const [joining,       setJoining]       = useState(null);
    const [showMembersFor, setShowMembersFor] = useState(null); // groupId

    // Debounce search input — only update filter after 280ms of no typing
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 280);
        return () => clearTimeout(t);
    }, [search]);

    const loadGroups = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data } = await api.get('/groups');
            setGroups(data);
        } catch (error) {
            if (!silent) toast.error('Failed to load groups');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => { loadGroups(); }, [loadGroups]);

    // Poll every 15s so new groups/membership changes appear
    useEffect(() => {
        const t = setInterval(() => loadGroups(true), 15000);
        return () => clearInterval(t);
    }, [loadGroups]);

    /* ── filter ───────────────────────────────────────────────── */
    const subjects = useMemo(
        () => [...new Set(groups.map(g => g.subject).filter(Boolean))].sort(),
        [groups]
    );
    const filtered = useMemo(() => {
        const q = debouncedSearch.toLowerCase();
        return groups.filter(g =>
            (!q || g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q))
            && (!subjectFilter || g.subject === subjectFilter)
        );
    }, [groups, debouncedSearch, subjectFilter]);

    /* ── actions ──────────────────────────────────────────────── */
    const handleJoin = async (groupId) => {
        if (!user) { navigate('/login'); return; }
        setJoining(groupId);

        try {
            const { data } = await api.post(`/groups/${groupId}/join`);

            if (data.requestStatus === 'pending') {
                // Group requires approval — show pending state, don't mark as member yet
                toast.info('Join request sent! Waiting for admin approval.');
                setGroups(prev => prev.map(g =>
                    g.id === groupId ? { ...g, pendingRequest: true } : g
                ));
            } else {
                // Instant join
                toast.success('You joined the group!');
                setGroups(prev => prev.map(g =>
                    g.id === groupId
                        ? { ...g, isMember: true, memberRole: 'member', current_members: (g.current_members || 0) + 1 }
                        : g
                ));
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to join group';
            // Already pending
            if (err.response?.data?.requestStatus === 'pending') {
                toast.info('Your join request is already pending approval.');
            } else {
                toast.error(msg);
            }
        } finally {
            setJoining(null);
        }
    };

    const handleLeave = async (groupId) => {
        // Optimistic update — immediately remove membership
        setGroups(prev => prev.map(g =>
            g.id === groupId
                ? { ...g, isMember: false, memberRole: null, current_members: Math.max(0, (g.current_members || 1) - 1) }
                : g
        ));

        try {
            await api.delete(`/groups/${groupId}/leave`);
            toast.success('You left the group');
        } catch (err) {
            // Roll back on failure
            setGroups(prev => prev.map(g =>
                g.id === groupId
                    ? { ...g, isMember: true, memberRole: 'member', current_members: (g.current_members || 0) + 1 }
                    : g
            ));
            toast.error(err.response?.data?.error || 'Failed to leave group');
        }
    };

    const totalMembers = groups.reduce((s, g) => s + (g.current_members || 0), 0);

    return (
        <div className="lg:pl-60 min-h-screen bg-bg text-fg">
            <Sidebar />

            {/* ── HERO ────────────────────────────────────────── */}
            <section className="pt-20 px-6 py-12 text-center border-b border-border bg-primary-subtle">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Study Groups</h1>
                <p className="max-w-xl mx-auto mb-8 text-sm text-fg-secondary">
                    Join collaborative learning communities, share knowledge, and grow with peers.
                </p>
                <div className="flex justify-center gap-12 flex-wrap">
                    {[
                        [groups.length,  'Active Groups'],
                        [totalMembers,   'Total Members'],
                        [subjects.length,'Subjects'],
                    ].map(([n, l]) => (
                        <div key={l} className="text-center">
                            <div className="text-3xl font-bold tabular-nums text-primary" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{n}</div>
                            <div className="text-xs mt-0.5 text-fg-secondary">{l}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FILTER BAR ──────────────────────────────────── */}
            <div className="sticky top-16 z-30 px-4 sm:px-6 py-3 border-b border-border bg-surface">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                        <Input
                            type="text"
                            placeholder="Search groups…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 h-10"
                        />
                    </div>
                    <Select
                        value={subjectFilter}
                        onChange={e => setSubjectFilter(e.target.value)}
                        className="h-10 min-w-[140px]"
                    >
                        <option value="">All Subjects</option>
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    {user ? (
                        <Button
                            onClick={() => setShowModal(true)}
                            disabled={!isOnline}
                            icon={!isOnline ? WifiOff : Plus}
                            className="w-full sm:w-auto"
                            title={!isOnline ? "You're offline — reconnect to create groups" : "Create a new group"}
                        >
                            Create Group
                        </Button>
                    ) : (
                        <Button to="/login" variant="outline" className="w-full sm:w-auto">
                            Sign In to Create
                        </Button>
                    )}
                </div>
            </div>

            {/* ── GRID ────────────────────────────────────────── */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="rounded-2xl overflow-hidden border border-border bg-surface">
                                <Skeleton className="h-28 rounded-none" />
                                <div className="p-6 flex flex-col gap-3">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-5/6" />
                                    <Skeleton className="h-8 mt-2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={SearchX}
                        title="No groups found"
                        description={search || subjectFilter ? 'Try a different search or filter.' : 'Be the first to create a study group!'}
                        action={user && <Button onClick={() => setShowModal(true)}>Create First Group</Button>}
                    />
                ) : (
                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                        variants={stagger} initial="hidden" animate="show"
                    >
                        {filtered.map(group => (
                            <GroupCard
                                key={group.id}
                                group={group}
                                user={user}
                                joining={joining === group.id}
                                onJoin={() => handleJoin(group.id)}
                                onLeave={() => handleLeave(group.id)}
                                onViewMembers={() => setShowMembersFor(group.id)}
                                isOnline={isOnline}
                            />
                        ))}
                    </motion.div>
                )}
            </div>

            {/* ── CREATE MODAL ────────────────────────────────── */}
            <CreateGroupModal
                open={showModal}
                onClose={() => setShowModal(false)}
                onCreated={() => { setShowModal(false); loadGroups(false); toast.success('Group created!'); }}
            />

            {/* ── MEMBERS MODAL ───────────────────────────────── */}
            <MembersModal
                open={!!showMembersFor}
                groupId={showMembersFor}
                onClose={() => setShowMembersFor(null)}
            />
        </div>
    );
}

/* ── group card ───────────────────────────────────────────────── */
function GroupCard({ group, user, joining, onJoin, onLeave, onViewMembers, isOnline }) {
    const banner   = getBanner(group.subject);
    const isFull   = group.current_members >= group.max_members;
    const isMember = group.isMember;
    const isOwner  = group.memberRole === 'owner';
    const confirm  = useInlineConfirm();

    return (
        <motion.div
            variants={cardVariant}
            whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(59,130,246,0.12)' }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="rounded-2xl overflow-hidden border border-border bg-surface flex flex-col relative"
        >
            {/* Unread badge */}
            {group.unreadCount > 0 && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-danger shadow-md"
                >
                    {group.unreadCount > 9 ? '9+' : group.unreadCount}
                </motion.div>
            )}
            {/* banner — Lucide icon + glow + texture */}
            <div className="relative h-28 flex items-center justify-center select-none overflow-hidden" style={{ background: banner.gradient }}>
                {/* diagonal stripe texture at low opacity */}
                <div aria-hidden style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 12px)',
                }} />
                {/* ambient glow behind icon */}
                <div aria-hidden style={{
                    position: 'absolute',
                    width: 80, height: 80, borderRadius: '50%',
                    background: `radial-gradient(circle, ${banner.glow}55 0%, transparent 70%)`,
                    filter: 'blur(8px)',
                }} />
                <banner.Icon
                    size={44}
                    color="rgba(255,255,255,0.92)"
                    strokeWidth={1.5}
                    style={{ filter: `drop-shadow(0 2px 12px ${banner.glow}88)`, position: 'relative' }}
                />
            </div>

            <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-semibold text-sm leading-snug text-fg">{group.name}</h3>
                    <Badge tone="primary" size="sm" className="shrink-0">{group.subject}</Badge>
                </div>
                <p className="text-xs mb-3 flex-1 line-clamp-2 text-fg-secondary" style={{ lineHeight: 1.7 }}>
                    {group.description}
                </p>
                <div className="flex justify-between text-xs mb-4 text-fg-secondary">
                    <button
                        onClick={onViewMembers}
                        className={`inline-flex items-center gap-1 font-semibold transition-colors hover:text-primary ${isFull ? 'text-danger' : 'text-success'}`}
                    >
                        <Users size={12} />
                        {group.current_members}/{group.max_members}
                        <UserCheck size={11} className="ml-0.5 opacity-60" />
                    </button>
                    <span>by {group.users?.first_name} {group.users?.last_name}</span>
                </div>

                {/* action buttons */}
                {!user ? (
                    <Button to="/login" variant="outline" size="sm" fullWidth>
                        Sign In to Join
                    </Button>
                ) : isMember ? (
                    <div className="flex gap-2">
                        <Button to={`/groups/${group.id}/chat`} size="sm" fullWidth>
                            Open Chat
                        </Button>
                        {!isOwner && (
                            <InlineConfirm
                                active={confirm.active}
                                onCancel={confirm.cancel}
                                onConfirm={() => confirm.run(onLeave)}
                                confirmLabel="Yes, leave"
                                trigger={
                                    <button
                                        onClick={confirm.ask}
                                        className="px-3 py-2 rounded-md text-xs border border-border text-fg-secondary transition-colors hover:border-danger hover:text-danger"
                                    >
                                        Leave
                                    </button>
                                }
                            />
                        )}
                    </div>
                ) : isFull ? (
                    <button disabled className="w-full text-xs py-2 rounded-md opacity-50 cursor-not-allowed border border-border">
                        Group Full
                    </button>
                ) : group.pendingRequest ? (
                    <div className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-md font-semibold cursor-not-allowed bg-warning-bg text-warning border border-warning/30">
                        <Clock size={12} /> Request Pending
                    </div>
                ) : (
                    <Button
                        onClick={onJoin}
                        disabled={joining || !isOnline}
                        loading={joining}
                        icon={!isOnline ? WifiOff : undefined}
                        size="sm"
                        fullWidth
                        className="!bg-[image:linear-gradient(135deg,#10b981,#34d399)]"
                        title={!isOnline ? "You're offline — reconnect to join" : "Join this group"}
                    >
                        {!isOnline ? 'Offline' : joining ? 'Joining…' : 'Join Group'}
                    </Button>
                )}
            </div>
        </motion.div>
    );
}

/* ── create group modal ───────────────────────────────────────── */
function CreateGroupModal({ open, onClose, onCreated }) {
    const [form,       setForm]       = useState({ name: '', subject: '', maxMembers: 20, description: '' });
    const [submitting, setSubmitting] = useState(false);
    const firstRef = useRef(null);

    const handleSubmit = async e => {
        e.preventDefault();
        if (!form.name || !form.subject || !form.description) {
            toast.error('Name, subject, and description are required');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/groups', form);
            onCreated();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create group');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Create Study Group"
            size="md"
            initialFocusRef={firstRef}
            footer={
                <>
                    <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                    <Button type="submit" form="create-group-form" size="sm" loading={submitting}>
                        Create Group
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} id="create-group-form">
                <Field label="Group Name" required>
                    <Input ref={firstRef} type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Advanced Python Study Circle" />
                </Field>
                <Field label="Subject" required>
                    <Input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Computer Science" />
                </Field>
                <Field label="Max Members">
                    <Input type="number" min={2} max={100} value={form.maxMembers} onChange={e => setForm(f => ({ ...f, maxMembers: parseInt(e.target.value) || 20 }))} />
                </Field>
                <Field label="Description" required className="mb-0">
                    <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What will your group study? What's the focus?" rows={3} />
                </Field>
            </form>
        </Modal>
    );
}
