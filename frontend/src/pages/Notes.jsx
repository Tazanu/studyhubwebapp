import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Search, Plus, Download, FileText, Image as ImageIcon, File, Lock, WifiOff } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import Sidebar from '../components/Sidebar';
import UploadNoteModal from '../components/UploadNoteModal';

const cardVariant = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

function getFileIcon(fileType) {
    const type = (fileType || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(type)) return ImageIcon;
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(type)) return FileText;
    return File;
}

function NoteCard({ note }) {
    const [hovered, setHovered] = useState(false);
    const FileIcon = getFileIcon(note.file_type);

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
            className="rounded-2xl p-5 border flex flex-col"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
            <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(0,102,255,0.12)' }}>
                    <FileIcon size={20} style={{ color: 'var(--accent-blue)' }} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-snug truncate">{note.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full inline-block mt-1"
                        style={{ background: 'rgba(0,102,255,0.12)', color: 'var(--accent-blue)' }}>
                        {note.subject}
                    </span>
                </div>
            </div>

            <p className="text-xs mb-4 flex-1 line-clamp-2" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {note.description}
            </p>

            <div className="flex justify-between text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1">
                    <Download size={12} /> {note.downloads || 0}
                </span>
                <span>by {note.users?.first_name} {note.users?.last_name}</span>
            </div>

            {note.is_premium && (
                <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', width: 'fit-content' }}>
                    <Lock size={12} /> {note.price} XAF
                </div>
            )}

            <Link
                to={`/notes/${note.id}`}
                className="block text-center text-xs py-2 rounded-lg font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #0052cc, #0066ff)' }}
            >
                View Details
            </Link>
        </motion.div>
    );
}

export default function Notes() {
    const { user } = useAuth();
    const canMarkPremium = user?.role === 'admin' || user?.tutor_status === 'approved';
    const navigate = useNavigate();
    const isOnline = useOnlineStatus();

    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [premiumFilter, setPremiumFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [showUploadModal, setShowUploadModal] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 280);
        return () => clearTimeout(t);
    }, [search]);

    const loadNotes = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data } = await api.get('/notes');
            setNotes(data);
        } catch {
            if (!silent) toast.error('Failed to load notes');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => { loadNotes(); }, []);

    // Poll every 15s so other users' uploads appear
    useEffect(() => {
        const t = setInterval(() => loadNotes(true), 15000);
        return () => clearInterval(t);
    }, []);

    const subjects = useMemo(
        () => [...new Set(notes.map(n => n.subject).filter(Boolean))].sort(),
        [notes]
    );

    const filtered = useMemo(() => {
        const q = debouncedSearch.toLowerCase();
        let result = notes.filter(n => {
            const matchSearch = !q || n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q);
            const matchSubject = !subjectFilter || n.subject === subjectFilter;
            const matchPremium = premiumFilter === 'all'
                || (premiumFilter === 'free' && !n.is_premium)
                || (premiumFilter === 'premium' && n.is_premium);
            return matchSearch && matchSubject && matchPremium;
        });

        if (sortBy === 'newest') {
            result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (sortBy === 'downloads') {
            result.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
        }

        return result;
    }, [notes, debouncedSearch, subjectFilter, premiumFilter, sortBy]);

    const totalDownloads = notes.reduce((sum, n) => sum + (n.downloads || 0), 0);

    return (
        <div className="lg:pl-60" style={{ background: 'var(--bg-main)', minHeight: '100vh', color: 'var(--text-primary)' }}>
            <Sidebar />

            {/* HERO */}
            <section className="pt-20 px-6 py-12 text-center border-b"
                style={{ background: 'linear-gradient(135deg,rgba(0,102,255,0.07),rgba(139,92,246,0.07))', borderColor: 'var(--border-subtle)' }}>
                <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text"
                    style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Study Notes</h1>
                <p className="max-w-xl mx-auto mb-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Access shared notes, upload your own, and help your peers succeed.
                </p>
                <div className="flex justify-center gap-12 flex-wrap">
                    {[
                        [notes.length, 'Total Notes'],
                        [totalDownloads, 'Downloads'],
                        [subjects.length, 'Subjects'],
                    ].map(([n, l]) => (
                        <div key={l} className="text-center">
                            <div className="text-3xl font-bold tabular-nums"
                                style={{ fontFamily: "'Space Grotesk',sans-serif", color: 'var(--accent-blue)' }}>{n}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{l}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FILTER BAR */}
            <div className="sticky top-16 z-30 px-4 sm:px-6 py-3 border-b"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                            style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search notes…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="form-input pl-9 pr-4"
                            style={{ height: 40 }}
                        />
                    </div>
                    <select
                        value={subjectFilter}
                        onChange={e => setSubjectFilter(e.target.value)}
                        className="form-input px-3"
                        style={{ height: 40, minWidth: 120 }}
                    >
                        <option value="">All Subjects</option>
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                        value={premiumFilter}
                        onChange={e => setPremiumFilter(e.target.value)}
                        className="form-input px-3"
                        style={{ height: 40, minWidth: 100 }}
                    >
                        <option value="all">All</option>
                        <option value="free">Free</option>
                        <option value="premium">Premium</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="form-input px-3"
                        style={{ height: 40, minWidth: 120 }}
                    >
                        <option value="newest">Newest</option>
                        <option value="downloads">Most Downloaded</option>
                    </select>
                    {user ? (
                        <motion.button
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => setShowUploadModal(true)}
                            disabled={!isOnline}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                            style={{ background: 'linear-gradient(135deg,#0052cc,#0066ff)' }}
                            title={!isOnline ? "You're offline" : "Upload a note"}
                        >
                            {!isOnline ? <WifiOff size={15} /> : <Plus size={15} />} Upload Note
                        </motion.button>
                    ) : (
                        <Link to="/login" className="px-4 py-2 rounded-lg font-semibold border-2 text-sm"
                            style={{ borderColor: 'var(--accent-blue)', color: 'var(--text-primary)' }}>
                            Sign In to Upload
                        </Link>
                    )}
                </div>
            </div>

            {/* GRID */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="rounded-2xl p-6 border"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                                <div className="skeleton-shimmer h-4 rounded w-3/4 mb-3" />
                                <div className="skeleton-shimmer h-3 rounded w-full mb-2" />
                                <div className="skeleton-shimmer h-3 rounded w-5/6 mb-4" />
                                <div className="skeleton-shimmer h-8 rounded" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-4xl mb-4">📚</p>
                        <h3 className="text-xl font-semibold mb-2">No notes found</h3>
                        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                            {search || subjectFilter || premiumFilter !== 'all' ? 'Try different filters.' : 'Be the first to upload a note!'}
                        </p>
                        {user && (
                            <button onClick={() => setShowUploadModal(true)}
                                className="px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
                                style={{ background: 'linear-gradient(135deg,#0052cc,#0066ff)' }}>
                                Upload First Note
                            </button>
                        )}
                    </div>
                ) : (
                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                        variants={stagger} initial="hidden" animate="show"
                    >
                        {filtered.map(note => (
                            <NoteCard key={note.id} note={note} />
                        ))}
                    </motion.div>
                )}
            </div>

            <AnimatePresence>
                {showUploadModal && (
                    <UploadNoteModal
                        onClose={() => setShowUploadModal(false)}
                        onUploaded={() => { setShowUploadModal(false); loadNotes(false); toast.success('Note uploaded!'); }}
                        canMarkPremium={canMarkPremium}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
