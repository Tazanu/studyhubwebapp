import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ArrowLeft, Download, Trash2, FileText, Image as ImageIcon, File, Lock, Calendar, User, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import PaymentModal from '../components/tutor/PaymentModal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import { useInlineConfirm } from '../hooks/useInlineConfirm';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
    const [deleting, setDeleting] = useState(false);
    const confirmDelete = useInlineConfirm();
    const [showPayment, setShowPayment] = useState(false);
    const [purchased, setPurchased] = useState(false);
    const [viewerUrl, setViewerUrl] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);

    useEffect(() => {
        const loadNote = async () => {
            try {
                const { data } = await api.get(`/notes/${id}`);
                setNote(data);
                // The server decides what this viewer has unlocked — never
                // assume access from client state alone.
                setPurchased(!!data.purchased);
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
            await api.post(`/notes/${id}/download`);
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const proxyUrl = `${baseUrl}/notes/${id}/file`;

            if (note.is_premium) {
                // Paid files are served only behind the auth check, so <img> and
                // the PDF viewer can't fetch them directly — pull the bytes once
                // and render from a blob instead.
                const res = await fetch(proxyUrl, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || 'Could not open this note');
                }
                const blobUrl = URL.createObjectURL(await res.blob());
                setViewerUrl({ proxy: blobUrl, direct: blobUrl, isBlob: true });
            } else {
                // Free notes stream (or redirect) straight from the server, so
                // the viewer can point at the URL directly. `download=1` is a
                // separate URL rather than an `<a download>` attribute, which
                // browsers ignore cross-origin — the server sets an attachment
                // disposition instead, so the file actually saves.
                setViewerUrl({ proxy: proxyUrl, direct: `${proxyUrl}?download=1` });
            }
            setNote(prev => ({ ...prev, downloads: (prev.downloads || 0) + 1 }));
        } catch (err) {
            toast.error(err.response?.data?.error || err.message || 'Failed to open note');
        } finally {
            setDownloading(false);
        }
    };

    // Release blob URLs when the viewer closes or the page unmounts.
    useEffect(() => () => {
        if (viewerUrl?.isBlob) URL.revokeObjectURL(viewerUrl.proxy);
    }, [viewerUrl]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/notes/${id}`);
            toast.success('Note deleted');
            navigate('/notes');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete note');
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="lg:pl-60 min-h-screen bg-bg">
                <Sidebar />
                <div className="pt-20 px-6 max-w-4xl mx-auto">
                    <div className="rounded-2xl p-8 border border-border bg-surface">
                        <Skeleton className="h-8 w-3/4 mb-4" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-5/6 mb-6" />
                        <Skeleton className="h-12 w-32" />
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
        <div className="lg:pl-60 min-h-screen bg-bg text-fg">
            <Sidebar />

            <div className="pt-20 px-6 pb-16 max-w-4xl mx-auto">
                {/* Back button */}
                <Link to="/notes" className="inline-flex items-center gap-2 mb-6 text-sm text-fg-secondary transition-colors hover:text-primary">
                    <ArrowLeft size={16} /> Back to Notes
                </Link>

                <motion.div
                    className="rounded-2xl p-8 border border-border bg-surface"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* Header with icon and title */}
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 bg-primary-subtle">
                            <FileIcon size={28} className="text-primary" strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                {note.title}
                            </h1>
                            <Badge tone="primary">{note.subject}</Badge>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="mb-6 leading-relaxed text-fg-secondary">
                        {note.description}
                    </p>

                    {/* Tags */}
                    {note.tags && note.tags.length > 0 && (
                        <div className="mb-6 flex flex-wrap gap-2">
                            {note.tags.map((tag, i) => (
                                <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-surface-hover text-fg-secondary">
                                    <Tag size={12} /> {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Meta info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 rounded-xl bg-surface-hover">
                        <div>
                            <p className="text-xs mb-1 text-fg-secondary">Uploaded by</p>
                            <p className="text-sm font-semibold flex items-center gap-1">
                                <User size={14} /> {note.users?.first_name} {note.users?.last_name}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs mb-1 text-fg-secondary">Downloads</p>
                            <p className="text-sm font-semibold flex items-center gap-1">
                                <Download size={14} /> {note.downloads || 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs mb-1 text-fg-secondary">File Type</p>
                            <p className="text-sm font-semibold uppercase">.{note.file_type}</p>
                        </div>
                        <div>
                            <p className="text-xs mb-1 text-fg-secondary">Uploaded</p>
                            <p className="text-sm font-semibold flex items-center gap-1">
                                <Calendar size={14} /> {new Date(note.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {/* Group info if linked */}
                    {note.groups && (
                        <div className="mb-6 p-4 rounded-xl border border-border">
                            <p className="text-xs mb-1 text-fg-secondary">Shared in group</p>
                            <Link to={`/groups/${note.groups.id}`} className="text-sm font-semibold text-primary transition-colors hover:opacity-80">
                                {note.groups.name}
                            </Link>
                        </div>
                    )}

                    {/* Premium badge */}
                    {note.is_premium && (
                        <Badge tone="warning" size="md" className="mb-6 !text-sm !px-4 !py-3 w-fit" icon={Lock}>
                            Premium Note. {note.price} XAF
                        </Badge>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                        {isPremiumLocked ? (
                            <Button onClick={() => setShowPayment(true)} icon={Lock} size="lg" className="!bg-[image:linear-gradient(135deg,#f59e0b,#d97706)]">
                                Purchase to unlock — {note.price} XAF
                            </Button>
                        ) : (
                            <Button onClick={handleDownload} disabled={downloading} loading={downloading} icon={downloading ? undefined : Download} size="lg">
                                {downloading ? 'Opening...' : 'Open Note'}
                            </Button>
                        )}

                        {isOwner && (
                            confirmDelete.active ? (
                                <div className="flex gap-2">
                                    <Button onClick={() => confirmDelete.run(handleDelete)} disabled={deleting} loading={deleting} variant="danger" size="lg">
                                        Yes, delete
                                    </Button>
                                    <Button onClick={confirmDelete.cancel} variant="secondary" size="lg">
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button onClick={confirmDelete.ask} variant="outline" icon={Trash2} size="lg" className="!border-border !text-fg-secondary hover:!border-danger hover:!text-danger hover:!bg-transparent">
                                    Delete Note
                                </Button>
                            )
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
                        className="fixed inset-0 z-50 flex flex-col bg-black/90"
                    >
                        {/* Top bar */}
                        <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-surface">
                            <span className="font-semibold text-sm truncate max-w-xs text-fg">{note.title}</span>
                            <div className="flex items-center gap-3">
                                {numPages && (
                                    <div className="flex items-center gap-2 text-sm text-fg-secondary">
                                        <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>
                                            <ChevronLeft size={18} />
                                        </button>
                                        <span>{pageNumber} / {numPages}</span>
                                        <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}>
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                )}
                                <a href={viewerUrl.direct} download target="_blank" rel="noreferrer"
                                    className="text-sm px-3 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1 bg-primary-solid text-white">
                                    <Download size={14} /> Download
                                </a>
                                <button onClick={() => { setViewerUrl(null); setNumPages(null); setPageNumber(1); }}
                                    className="text-sm px-3 py-1.5 rounded-lg border border-border text-fg-secondary">
                                    Close
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto flex justify-center p-4">
                            {['jpg','jpeg','png','gif','webp','svg'].includes(note.file_type?.toLowerCase()) ? (
                                <img src={viewerUrl.proxy} alt={note.title} className="max-h-full max-w-full object-contain rounded-xl" />
                            ) : note.file_type?.toLowerCase() === 'pdf' ? (
                                <Document
                                    file={viewerUrl.proxy}
                                    onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); }}
                                    onLoadError={() => toast.error('Failed to load PDF')}
                                    loading={<p className="text-white mt-10">Loading PDF...</p>}
                                    error={<div className="text-white mt-20 text-center"><p className="mb-4">This file was uploaded before our storage migration and is no longer available.</p><p className="text-sm text-white/60">Please delete this note and re-upload the file.</p></div>}
                                >
                                    <Page pageNumber={pageNumber} width={Math.min(window.innerWidth - 32, 800)} />
                                </Document>
                            ) : (
                                <div className="text-white mt-20 text-center">
                                    <p className="mb-4">Preview not available for this file type.</p>
                                    <a href={viewerUrl.direct} download target="_blank" rel="noreferrer"
                                        className="px-4 py-2 rounded-lg font-semibold bg-primary-solid text-white">
                                        Download File
                                    </a>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <PaymentModal
                open={showPayment}
                onClose={() => setShowPayment(false)}
                onSuccess={async () => {
                    setShowPayment(false);
                    // Re-fetch so `purchased` and `file_path` come from the server.
                    try {
                        const { data } = await api.get(`/notes/${id}`);
                        setNote(data);
                        setPurchased(!!data.purchased);
                    } catch { setPurchased(true); }
                    toast.success('Payment successful! You can now download this note.');
                }}
                amount={note?.price || 0}
                description={`Premium Note: ${note?.title}`}
                order={{ type: 'paid_note', noteId: note?.id }}
            />
        </div>
    );
}
