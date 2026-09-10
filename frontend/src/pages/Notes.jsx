import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Search, Plus, Download, FileText, Image as ImageIcon, File, Lock, WifiOff, Trash2, BookX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// Toasts are fired imperatively, never rendered, so they read from the i18n
// instance instead of the hook's `t` — that keeps `t` out of fetch closures and
// their dependency arrays honest.
import i18n from '../i18n';
import api, { apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import Sidebar from '../components/Sidebar';
import UploadNoteModal from '../components/UploadNoteModal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import { useInlineConfirm } from '../hooks/useInlineConfirm';

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

function NoteCard({ note, onDeleted }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [hovered, setHovered] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const confirm = useInlineConfirm();
    const FileIcon = getFileIcon(note.file_type);
    const canDelete = user && (user.id === note.uploaded_by || user.role === 'admin');

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/notes/${note.id}`);
            toast.success(t('notes.deleted'));
            onDeleted(note.id);
        } catch (err) {
            toast.error(apiError(err, t('notes.deleteFailed')));
            setDeleting(false);
        }
    };

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
            className="rounded-2xl p-5 border border-border bg-surface flex flex-col"
        >
            <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary-subtle">
                    <FileIcon size={20} className="text-primary" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-snug truncate text-fg">{note.title}</h3>
                    <Badge tone="primary" size="sm" className="mt-1">{t(`subjectName.${note.subject}`, { defaultValue: note.subject })}</Badge>
                </div>
                {canDelete && (
                    <button onClick={confirm.ask} aria-label={t('common.delete')}
                        className="shrink-0 p-1.5 rounded-lg transition-colors text-fg-muted hover:text-danger">
                        <Trash2 size={15} />
                    </button>
                )}
            </div>

            <p className="text-xs mb-4 flex-1 line-clamp-2 text-fg-secondary" style={{ lineHeight: 1.7 }}>
                {note.description}
            </p>

            <div className="flex justify-between text-xs mb-4 text-fg-secondary">
                <span className="flex items-center gap-1">
                    <Download size={12} /> {note.downloads || 0}
                </span>
                <span>{t('notes.by', { name: `${note.users?.first_name ?? ''} ${note.users?.last_name ?? ''}`.trim() })}</span>
            </div>

            {note.is_premium && (
                <Badge tone="warning" className="mb-3 w-fit" icon={Lock}>{note.price} XAF</Badge>
            )}

            {confirm.active ? (
                <div className="flex gap-2">
                    <Button onClick={() => confirm.run(handleDelete)} disabled={deleting} loading={deleting} variant="danger" size="sm" fullWidth>
                        {t('notes.confirmDelete')}
                    </Button>
                    <Button onClick={confirm.cancel} variant="secondary" size="sm" fullWidth>
                        {t('common.cancel')}
                    </Button>
                </div>
            ) : (
                <Button to={`/notes/${note.id}`} size="sm" fullWidth>
                    {t('notes.viewDetails')}
                </Button>
            )}
        </motion.div>
    );
}

export default function Notes() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const canMarkPremium = user?.role === 'admin' || user?.tutor_status === 'approved';
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
        const timer = setTimeout(() => setDebouncedSearch(search), 280);
        return () => clearTimeout(timer);
    }, [search]);

    const loadNotes = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data } = await api.get('/notes');
            setNotes(data);
        } catch {
            if (!silent) toast.error(i18n.t('notes.loadFailed'));
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => { loadNotes(); }, []);

    // Poll every 15s so other users' uploads appear
    useEffect(() => {
        const timer = setInterval(() => loadNotes(true), 15000);
        return () => clearInterval(timer);
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
        <div className="lg:pl-60 min-h-screen bg-bg text-fg">
            <Sidebar />

            {/* HERO */}
            <section className="pt-20 px-6 py-12 text-center border-b border-border bg-primary-subtle">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{t('notes.title')}</h1>
                <p className="max-w-xl mx-auto mb-8 text-sm text-fg-secondary">
                    {t('notes.subtitle')}
                </p>
                <div className="flex justify-center gap-12 flex-wrap">
                    {[
                        [notes.length, t('notes.totalNotes')],
                        [totalDownloads, t('notes.downloads')],
                        [subjects.length, t('notes.subjects')],
                    ].map(([n, l]) => (
                        <div key={l} className="text-center">
                            <div className="text-3xl font-bold tabular-nums text-primary" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{n}</div>
                            <div className="text-xs mt-0.5 text-fg-secondary">{l}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FILTER BAR */}
            <div className="sticky top-16 z-30 px-4 sm:px-6 py-3 border-b border-border bg-surface">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                        <Input
                            type="text"
                            placeholder={t('notes.searchPlaceholder')}
                            aria-label={t('notes.searchPlaceholder')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 h-10"
                        />
                    </div>
                    <Select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="h-10 min-w-[120px]">
                        <option value="">{t('notes.allSubjects')}</option>
                        {subjects.map(s => <option key={s} value={s}>{t(`subjectName.${s}`, { defaultValue: s })}</option>)}
                    </Select>
                    <Select value={premiumFilter} onChange={e => setPremiumFilter(e.target.value)} className="h-10 min-w-[100px]">
                        <option value="all">{t('notes.filterAll')}</option>
                        <option value="free">{t('notes.filterFree')}</option>
                        <option value="premium">{t('notes.filterPremium')}</option>
                    </Select>
                    <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="h-10 min-w-[120px]">
                        <option value="newest">{t('notes.sortNewest')}</option>
                        <option value="downloads">{t('notes.sortDownloads')}</option>
                    </Select>
                    {user ? (
                        <Button
                            onClick={() => setShowUploadModal(true)}
                            disabled={!isOnline}
                            icon={!isOnline ? WifiOff : Plus}
                            className="w-full sm:w-auto"
                            title={!isOnline ? t('notes.offlineTitle') : t('notes.uploadTitle')}
                        >
                            {t('notes.upload')}
                        </Button>
                    ) : (
                        <Button to="/login" variant="outline" className="w-full sm:w-auto">
                            {t('notes.signInToUpload')}
                        </Button>
                    )}
                </div>
            </div>

            {/* GRID */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="rounded-2xl p-6 border border-border bg-surface">
                                <Skeleton className="h-4 w-3/4 mb-3" />
                                <Skeleton className="h-3 w-full mb-2" />
                                <Skeleton className="h-3 w-5/6 mb-4" />
                                <Skeleton className="h-8" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={BookX}
                        title={t('notes.emptyTitle')}
                        description={search || subjectFilter || premiumFilter !== 'all' ? t('notes.emptyFiltered') : t('notes.emptyNone')}
                        action={user && <Button onClick={() => setShowUploadModal(true)}>{t('notes.uploadFirst')}</Button>}
                    />
                ) : (
                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                        variants={stagger} initial="hidden" animate="show"
                    >
                        {filtered.map(note => (
                            <NoteCard key={note.id} note={note} onDeleted={id => setNotes(prev => prev.filter(n => n.id !== id))} />
                        ))}
                    </motion.div>
                )}
            </div>

            <UploadNoteModal
                open={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onUploaded={() => { setShowUploadModal(false); loadNotes(false); toast.success(t('notes.uploaded')); }}
                canMarkPremium={canMarkPremium}
            />
        </div>
    );
}
