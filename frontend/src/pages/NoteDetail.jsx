import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Download, Trash2, FileText, Image as ImageIcon, File, Lock, Calendar, User, Tag } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import PaymentModal from '../components/tutor/PaymentModal';

function getFileIcon(fileType) {
    const type = (fileType || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(type)) return ImageIcon;
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(type)) return FileText;
    return File;
}

export default function NoteDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [purchased, setPurchased] = useState(false);
    const [viewerUrl, setViewerUrl] = useState(null);

    useEffect(() => {
        const loadNote = async () => {
            try {
                const { data } = await api.get(`/notes/${id}`);
                setNote(data);
            } catch (err) {
                toast.error('Note not found');
                navigate('/notes');
            } finally {
                setLoading(false);
            }
        };
        loadNote();
    }, [id, navigate]);

    const handleDownload = async () => {
        if (!note) return;

        if (note.is_premium && !isOwner && !purchased) {
            setShowPayment(true);
            return;
        }

        setDownloading(true);
        try {
            const { data } = await api.post(`/notes/${id}/download`);
            const fileUrl = data.file_path.startsWith('http')
                ? data.file_path
                : `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')}${data.file_path}`;
            setViewerUrl(fileUrl);
            setNote(prev => ({ ...prev, downloads: (prev.downloads || 0) + 1 }));
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to open note');
        } finally {
            setDownloading(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/notes/${id}`);
            toast.success('Note deleted');
            navigate('/notes');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete note');
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    if (loading) {
        return (
            <div className="lg:pl-60" style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
                <Sidebar />
                <div className="pt-20 px-6 max-w-4xl mx-auto">
                    <div className="rounded-2xl p-8 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                        <div className="skeleton-shimmer h-8 rounded w-3/4 mb-4" />
                        <div className="skeleton-shimmer h-4 rounded w-full mb-2" />
                        <div className="skeleton-shimmer h-4 rounded w-5/6 mb-6" />
                        <div className="skeleton-shimmer h-12 rounded w-32" />
                    </div>
                </div>
            </div>
        );
    }

    if (!note) return null;

    const FileIcon = getFileIcon(note.file_type);
    const isOwner = user && user.id === note.uploaded_by;
    const isPremiumLocked = note.is_premium && !isOwner && !purchased;

    return (
        <div className="lg:pl-60" style={{ background: 'var(--bg-main)', minHeight: '100vh', color: 'var(--text-primary)' }}>
            <Sidebar />

            <div className="pt-20 px-6 pb-16 max-w-4xl mx-auto">
                {/* Back button */}
                <Link to="/notes" className="inline-flex items-center gap-2 mb-6 text-sm transition-colors hover:text-blue-400"
                    style={{ color: 'var(--text-secondary)' }}>
                    <ArrowLeft size={16} /> Back to Notes
                </Link>

                <motion.div
                    className="rounded-2xl p-8 border"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* Header with icon and title */}
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(0,102,255,0.12)' }}>
                            <FileIcon size={28} style={{ color: 'var(--accent-blue)' }} strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                {note.title}
                            </h1>
                            <span className="text-sm px-3 py-1 rounded-full inline-block"
                                style={{ background: 'rgba(0,102,255,0.12)', color: 'var(--accent-blue)' }}>
                                {note.subject}
                            </span>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {note.description}
                    </p>

                    {/* Tags */}
                    {note.tags && note.tags.length > 0 && (
                        <div className="mb-6 flex flex-wrap gap-2">
                            {note.tags.map((tag, i) => (
                                <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                                    style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                                    <Tag size={12} /> {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Meta info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 rounded-xl"
                        style={{ background: 'var(--bg-hover)' }}>
                        <div>
                            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Uploaded by</p>
                            <p className="text-sm font-semibold flex items-center gap-1">
                                <User size={14} /> {note.users?.first_name} {note.users?.last_name}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Downloads</p>
                            <p className="text-sm font-semibold flex items-center gap-1">
                                <Download size={14} /> {note.downloads || 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>File Type</p>
                            <p className="text-sm font-semibold uppercase">.{note.file_type}</p>
                        </div>
                        <div>
                            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Uploaded</p>
                            <p className="text-sm font-semibold flex items-center gap-1">
                                <Calendar size={14} /> {new Date(note.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {/* Group info if linked */}
                    {note.groups && (
                        <div className="mb-6 p-4 rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
                            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Shared in group</p>
                            <Link to={`/groups/${note.groups.id}`} className="text-sm font-semibold transition-colors hover:text-blue-400"
                                style={{ color: 'var(--accent-blue)' }}>
                                {note.groups.name}
                            </Link>
                        </div>
                    )}

                    {/* Premium badge */}
                    {note.is_premium && (
                        <div className="mb-6 flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl"
                            style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', width: 'fit-content' }}>
                            <Lock size={18} /> Premium Note. {note.price} XAF
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                        {isPremiumLocked ? (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowPayment(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
                                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }}
                            >
                                <Lock size={16} /> Purchase to unlock — {note.price} XAF
                            </motion.button>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleDownload}
                                disabled={downloading}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg, #0052cc, #0066ff)' }}
                            >
                                <Download size={16} /> {downloading ? 'Opening...' : 'Open Note'}
                            </motion.button>
                        )}

                        {isOwner && (
                            <AnimatePresence mode="wait">
                                {confirmDelete ? (
                                    <motion.div
                                        key="confirm"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="flex gap-2"
                                    >
                                        <button
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            className="px-4 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-60"
                                            style={{ background: 'var(--error)' }}
                                        >
                                            {deleting ? 'Deleting...' : 'Yes, delete'}
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(false)}
                                            className="px-4 py-3 rounded-xl font-semibold border text-sm"
                                            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                                        >
                                            Cancel
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.button
                                        key="delete"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        onClick={() => setConfirmDelete(true)}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border text-sm transition-colors hover:border-red-500 hover:text-red-500"
                                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                                    >
                                        <Trash2 size={16} /> Delete Note
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* File Viewer Modal */}
            <AnimatePresence>
                {viewerUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex flex-col"
                        style={{ background: 'rgba(0,0,0,0.85)' }}
                    >
                        <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--bg-card)' }}>
                            <span className="font-semibold text-sm truncate">{note.title}</span>
                            <div className="flex items-center gap-3">
                                <a href={viewerUrl} download target="_blank" rel="noreferrer"
                                    className="text-sm px-3 py-1.5 rounded-lg font-semibold"
                                    style={{ background: 'var(--accent-blue)', color: 'white' }}>
                                    <Download size={14} className="inline mr-1" />Download
                                </a>
                                <button onClick={() => setViewerUrl(null)}
                                    className="text-sm px-3 py-1.5 rounded-lg border"
                                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                    Close
                                </button>
                            </div>
                        </div>
                        {['jpg','jpeg','png','gif','webp','svg'].includes(note.file_type?.toLowerCase()) ? (
                            <div className="flex-1 flex items-center justify-center p-4">
                                <img src={viewerUrl} alt={note.title} className="max-h-full max-w-full object-contain rounded-xl" />
                            </div>
                        ) : (
                            <iframe src={viewerUrl} className="flex-1 w-full border-0" title={note.title} />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <PaymentModal
                open={showPayment}
                onClose={() => setShowPayment(false)}
                onSuccess={() => {
                    setPurchased(true);
                    setShowPayment(false);
                    toast.success('Payment successful! You can now download this note.');
                }}
                amount={note?.price || 0}
                description={`Premium Note: ${note?.title}`}
                type="note_purchase"
                metadata={{ noteId: note?.id }}
            />
        </div>
    );
}
