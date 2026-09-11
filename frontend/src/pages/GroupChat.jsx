import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, RefreshCw, Loader2, WifiOff, Paperclip, X, Image as ImageIcon, FileText, File, Reply, Edit2, Check, Search, Settings, Trash2, MessageCircle, SmilePlus, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import api, { apiError } from '../api/client';
import i18n from '../i18n';
import { formatDate as localeDate, formatTime as localeTime } from '../lib/formatDate';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import JoinRequestsPanel from '../components/JoinRequestsPanel';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { mediaUrl } from '../lib/mediaUrl';
import useGroupSocket from '../hooks/useGroupSocket';

// Socket delivery is the primary path. Polling stays as a fallback for when the
// connection is down, but at a much slower cadence than the old 4s — it exists
// to heal missed events, not to drive the chat.
const POLL_MS = 4000;
const POLL_MS_SOCKET_CONNECTED = 30000;

// Reactions offered in the picker. A short, fixed set keeps the UI simple and
// avoids shipping a full emoji keyboard.
const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🙏', '😮'];

function formatTime(ts) {
    return localeTime(ts, { hour: '2-digit', minute: '2-digit' });
}

/** "Today" / "Yesterday" / "12 March 2026" — the WhatsApp-style day divider. */
function formatDayLabel(ts) {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a, b) => a.toDateString() === b.toDateString();
    if (sameDay(d, today)) return i18n.t('chat.today');
    if (sameDay(d, yesterday)) return i18n.t('chat.yesterday');
    return localeDate(d, { day: 'numeric', month: 'long', year: 'numeric' });
}

const dayKey = ts => new Date(ts).toDateString();

/** Collapse a flat reaction list into [{ emoji, count, mine }] for rendering. */
function groupReactions(reactions, userId) {
    if (!reactions?.length) return [];
    const byEmoji = new Map();
    for (const r of reactions) {
        const entry = byEmoji.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false };
        entry.count += 1;
        if (r.user_id === userId) entry.mine = true;
        byEmoji.set(r.emoji, entry);
    }
    return [...byEmoji.values()];
}

export default function GroupChat() {
    const { t } = useTranslation();
    const { id }    = useParams();
    const { user }  = useAuth();
    const navigate  = useNavigate();
    const isOnline  = useOnlineStatus();

    const [group,     setGroup]     = useState(null);
    const [messages,  setMessages]  = useState([]);
    const [input,     setInput]     = useState('');
    const [sending,   setSending]   = useState(false);
    const [loadingMs, setLoadingMs] = useState(true);
    const [refreshing,setRefreshing]= useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [replyTo, setReplyTo] = useState(null);
    const [editingMsg, setEditingMsg] = useState(null);
    const [editText, setEditText] = useState('');
    const [fullImageView, setFullImageView] = useState(null);
    const [typingUsers, setTypingUsers] = useState([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [showEditGroup, setShowEditGroup] = useState(false);
    const [editGroupForm, setEditGroupForm] = useState({ name: '', description: '' });
    const [editGroupSaving, setEditGroupSaving] = useState(false);

    const bottomRef      = useRef(null);
    const scrollAreaRef  = useRef(null);
    const inputRef       = useRef(null);
    const fileInputRef   = useRef(null);
    const inputFocused   = useRef(false);
    const latestMsgId    = useRef(null);
    const messageRefs    = useRef({});
    const typingTimerRef = useRef(null);
    const userScrolled   = useRef(false);  // true when user has scrolled up
    const justSent       = useRef(false);  // true right after user sends a message
    const [showJumpBtn, setShowJumpBtn] = useState(false);
    const [reactionPickerFor, setReactionPickerFor] = useState(null);

    /* ── load group info once on mount ───────────────────────── */
    useEffect(() => {
        api.get(`/groups/${id}`)
            .then(({ data }) => {
                setGroup(data);
                setEditGroupForm({ name: data.name || '', description: data.description || '' });
                // Check if current user is admin
                const membership = data.user_groups?.find(ug => ug.user_id === user?.id);
                const adminStatus = membership?.role === 'owner' || membership?.role === 'admin';
                setIsAdmin(adminStatus);
            })
            .catch(() => navigate('/groups'));

        // Mark group as read when entering chat
        api.post(`/groups/${id}/read`).catch(() => {});
    }, [id, navigate, user]);

    /* ── load messages (with optional search) ────────────────── */
    const loadMessages = useCallback(async (silent = false, query = '') => {
        if (!silent) setLoadingMs(true);
        try {
            const url = query ? `/groups/${id}/messages?search=${encodeURIComponent(query)}` : `/groups/${id}/messages`;
            const { data } = await api.get(url);
            setMessages(data);
            if (data.length) latestMsgId.current = data[data.length - 1].id;

            // Scroll to first result if searching
            if (query && data.length > 0) {
                setTimeout(() => scrollToMessage(data[0].id), 100);
            }
        } catch (err) {
            if (err.response?.status === 403) {
                toast.error(i18n.t('chat.notMember'));
                navigate('/groups');
            }
        } finally {
            setLoadingMs(false);
            setRefreshing(false);
        }
    }, [id, navigate]);

    useEffect(() => { loadMessages(); }, [loadMessages]);

    /* ── realtime: the server already emitted these events, nothing listened ── */
    const upsertMessage = useCallback(incoming => {
        setMessages(prev => {
            const i = prev.findIndex(m => m.id === incoming.id);
            if (i !== -1) {
                const next = [...prev];
                next[i] = { ...next[i], ...incoming };
                return next;
            }
            // Our own send already inserted an optimistic row and replaced it
            // with the server's copy, so echoing it back would duplicate it.
            if (prev.some(m => m._pending && m.user_id === incoming.user_id && m.message === incoming.message)) {
                return prev;
            }
            return [...prev, incoming];
        });
    }, []);

    const { connected: socketConnected, emitTyping } = useGroupSocket(id, {
        onNewMessage: upsertMessage,
        onEditMessage: upsertMessage,
        onDeleteMessage: upsertMessage,
        onReaction: ({ messageId, reactions }) =>
            setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, reactions } : m))),
        onTyping: ({ users: names }) => setTypingUsers(names || []),
    });

    /* ── polling: primary when the socket is down, safety net when it is up ── */
    useEffect(() => {
        const interval = socketConnected ? POLL_MS_SOCKET_CONNECTED : POLL_MS;
        const timer = setInterval(() => {
            if (!inputFocused.current) {
                loadMessages(true);
                // Update read status periodically
                api.post(`/groups/${id}/read`).catch(() => {});
            }
            // The socket pushes typing updates; only fall back to polling for it
            // when there is no connection to push over.
            if (!socketConnected) {
                api.get(`/groups/${id}/typing`)
                    .then(({ data }) => setTypingUsers(data.typing || []))
                    .catch(() => {});
            }
        }, interval);
        return () => clearInterval(timer);
    }, [loadMessages, id, socketConnected]);

    /* ── track whether user has scrolled up ──────────────────── */
    const handleScroll = useCallback(() => {
        const el = scrollAreaRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        userScrolled.current = !atBottom;
        setShowJumpBtn(!atBottom);
    }, []);

    /* ── auto-scroll: only when at bottom or user just sent ──── */
    useEffect(() => {
        if (!userScrolled.current || justSent.current) {
            bottomRef.current?.scrollIntoView({ behavior: justSent.current ? 'smooth' : 'instant' });
            justSent.current = false;
            setShowJumpBtn(false);
        }
    }, [messages]);

    /* ── send (with optional file/reply) ─────────────────────── */
    const handleEditGroup = async (e) => {
        e.preventDefault();
        if (!editGroupForm.name.trim()) return toast.error(t('chat.nameRequired'));
        setEditGroupSaving(true);
        try {
            const { data } = await api.patch(`/groups/${id}`, editGroupForm);
            setGroup(prev => ({ ...prev, ...data }));
            setShowEditGroup(false);
            toast.success(t('chat.groupUpdated'));
        } catch (err) {
            toast.error(apiError(err, t('chat.updateFailed')));
        } finally {
            setEditGroupSaving(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!window.confirm(t('chat.confirmDeleteGroup'))) return;
        try {
            await api.delete(`/groups/${id}`);
            toast.success(t('chat.groupDeleted'));
            navigate('/groups');
        } catch (err) {
            toast.error(apiError(err, t('chat.deleteGroupFailed')));
        }
    };

    const handleSend = async e => {
        e.preventDefault();
        const text = input.trim();
        if (!text && !selectedFile) return;

        const formData = new FormData();
        if (text) formData.append('message', text);
        if (selectedFile) formData.append('file', selectedFile);
        if (replyTo) formData.append('reply_to', replyTo.id);

        // Optimistic update
        const optimistic = {
            id: `opt-${Date.now()}`,
            message: text,
            user_id: user.id,
            users: { id: user.id, first_name: user.first_name, last_name: user.last_name },
            created_at: new Date().toISOString(),
            file_url: selectedFile ? URL.createObjectURL(selectedFile) : null,
            file_type: selectedFile ? selectedFile.name.split('.').pop().toLowerCase() : null,
            reply_to: replyTo?.id,
            group_messages: replyTo ? { message: replyTo.message, users: replyTo.users } : null,
            _pending: true,
        };
        setMessages(prev => [...prev, optimistic]);
        setInput('');
        setSelectedFile(null);
        setReplyTo(null);
        setSending(true);
        justSent.current = true;
        userScrolled.current = false;
        inputRef.current?.focus();

        try {
            const { data } = await api.post(`/groups/${id}/messages`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setMessages(prev => prev.map(m => m.id === optimistic.id ? data.message : m));
        } catch (err) {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id));
            setInput(text);
            setSelectedFile(null);
            toast.error(apiError(err, t('chat.sendFailed')));
        } finally {
            setSending(false);
        }
    };

    /* ── edit message ────────────────────────────────────────── */
    const handleEdit = async (msg) => {
        if (!editText.trim()) return;

        try {
            const { data } = await api.patch(`/groups/${id}/messages/${msg.id}`, { message: editText.trim() });
            setMessages(prev => prev.map(m => m.id === msg.id ? data.message : m));
            setEditingMsg(null);
            setEditText('');
            toast.success(t('chat.messageEdited'));
        } catch (err) {
            toast.error(apiError(err, t('chat.editFailed')));
        }
    };

    /* ── delete message ──────────────────────────────────────── */
    // Soft delete on the server, so replies pointing here still resolve and the
    // bubble becomes "This message was deleted" rather than vanishing.
    const handleDelete = async (msg) => {
        const previous = messages;
        setMessages(prev => prev.map(m =>
            m.id === msg.id ? { ...m, is_deleted: true, message: '', file_url: null, reactions: [] } : m));
        try {
            await api.delete(`/groups/${id}/messages/${msg.id}`);
        } catch (err) {
            setMessages(previous);   // put it back; the delete did not happen
            toast.error(apiError(err, t('chat.deleteMessageFailed')));
        }
    };

    /* ── reactions ───────────────────────────────────────────── */
    const handleReact = async (msg, emoji) => {
        setReactionPickerFor(null);
        const previous = messages;
        // Optimistic toggle so the tap feels instant; the server's full set
        // replaces this either way.
        setMessages(prev => prev.map(m => {
            if (m.id !== msg.id) return m;
            const list = m.reactions || [];
            const mine = list.some(r => r.emoji === emoji && r.user_id === user?.id);
            return {
                ...m,
                reactions: mine
                    ? list.filter(r => !(r.emoji === emoji && r.user_id === user?.id))
                    : [...list, { emoji, user_id: user?.id }],
            };
        }));
        try {
            const { data } = await api.post(`/groups/${id}/messages/${msg.id}/reactions`, { emoji });
            setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, reactions: data.reactions } : m)));
        } catch (err) {
            setMessages(previous);
            toast.error(apiError(err, t('chat.reactFailed')));
        }
    };

    const startEdit = (msg) => {
        setEditingMsg(msg);
        setEditText(msg.message);
    };

    const cancelEdit = () => {
        setEditingMsg(null);
        setEditText('');
    };

    const scrollToMessage = (msgId) => {
        messageRefs.current[msgId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageRefs.current[msgId]?.classList.add('highlight-flash');
        setTimeout(() => messageRefs.current[msgId]?.classList.remove('highlight-flash'), 1500);
    };

    const canEdit = (msg) => {
        if (msg.user_id !== user?.id) return false;
        const ageMinutes = (Date.now() - new Date(msg.created_at).getTime()) / 1000 / 60;
        return ageMinutes <= 15;
    };

    const getFileIcon = (fileType) => {
        const images = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
        if (images.includes(fileType?.toLowerCase())) return ImageIcon;
        const docs = ['pdf', 'doc', 'docx', 'txt'];
        if (docs.includes(fileType?.toLowerCase())) return FileText;
        return File;
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);

        // Prefer the socket: the HTTP endpoint fired a request per keystroke and
        // the recipient only saw it on their next poll, up to 4s later.
        if (socketConnected) emitTyping(true);
        else api.post(`/groups/${id}/typing`).catch(() => {});

        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            if (socketConnected) emitTyping(false);
        }, 3000);
    };

    const handleSearch = useCallback((query) => {
        if (!query.trim()) {
            loadMessages();
            return;
        }
        loadMessages(false, query);
    }, [loadMessages]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadMessages(false);
    };

    return (
        <div className="lg:pl-60 flex flex-col bg-bg text-fg" style={{ height: 'calc(100dvh - 65px)', marginTop: '65px' }}>

            {/* ── HEADER ──────────────────────────────────────── */}
            <div className="border-b border-border bg-surface shrink-0">
                <div className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                        <Link to="/groups"
                            className="p-2 rounded-lg transition-colors text-fg-secondary hover:bg-primary-solid hover:text-white"
                            aria-label={t('chat.backToGroups')}>
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <h2 className="font-semibold text-sm leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                                {group?.name ?? t('chat.groupChat')}
                            </h2>
                            <p className="text-xs text-fg-secondary">
                                {group?.current_members ?? '…'} members · {group?.subject}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <button
                                onClick={() => setShowEditGroup(v => !v)}
                                className={`p-2 rounded-lg transition-colors ${showEditGroup ? 'text-primary' : 'text-fg-secondary'}`}
                                title={t('chat.editGroup')}
                            >
                                <Settings size={16} />
                            </button>
                        )}
                        <button
                            onClick={() => setSearchOpen(v => !v)}
                            className={`p-2 rounded-lg transition-colors ${searchOpen ? 'text-primary' : 'text-fg-secondary'}`}
                            aria-label={t('chat.searchMessages')}
                            title={t('chat.searchMessages')}
                        >
                            <Search size={16} />
                        </button>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2 rounded-lg transition-colors disabled:opacity-50 text-fg-secondary"
                            aria-label={t('chat.refreshMessages')}
                        >
                            <motion.span
                                animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
                                transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : {}}
                                style={{ display: 'flex' }}
                            >
                                <RefreshCw size={16} />
                            </motion.span>
                        </button>
                    </div>
                </div>

                {/* Edit Group Panel */}
                <AnimatePresence>
                    {showEditGroup && isAdmin && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-b border-border bg-surface-hover overflow-hidden"
                        >
                            <form onSubmit={handleEditGroup} className="px-5 py-4 flex flex-col gap-3">
                                <p className="text-xs font-semibold text-fg-secondary">{t('chat.editGroupTitle')}</p>
                                <Input
                                    value={editGroupForm.name}
                                    onChange={e => setEditGroupForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder={t('chat.groupNamePlaceholder')}
                                    className="h-10"
                                />
                                <Textarea
                                    value={editGroupForm.description}
                                    onChange={e => setEditGroupForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder={t('chat.descriptionPlaceholder')}
                                    rows={2}
                                />
                                <div className="flex gap-2">
                                    <Button type="submit" size="sm" loading={editGroupSaving}>
                                        {t('common.save')}
                                    </Button>
                                    <Button type="button" onClick={handleDeleteGroup} size="sm" variant="danger" icon={Trash2} className="!bg-danger-bg !text-danger">
                                        {t('chat.deleteGroup')}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Search bar */}
                <AnimatePresence>
                    {searchOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="px-5 pb-3 overflow-hidden"
                        >
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                                <Input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        handleSearch(e.target.value);
                                    }}
                                    placeholder={t('chat.searchPlaceholder')}
                                    className="pl-9 pr-9 h-10"
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            loadMessages();
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-fg-secondary hover:bg-danger hover:text-white transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── JOIN REQUESTS PANEL (admin only) ────────────── */}
            <JoinRequestsPanel groupId={parseInt(id)} isAdmin={isAdmin} />

            {/* ── MESSAGES ────────────────────────────────────── */}
            <div className="relative flex-1 min-h-0">
            {showJumpBtn && (
                <button
                    onClick={() => {
                        userScrolled.current = false;
                        setShowJumpBtn(false);
                        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="absolute bottom-3 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg bg-primary-solid"
                >
                    ↓ Jump to latest
                </button>
            )}
            <div
                ref={scrollAreaRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto px-5 py-5 flex flex-col gap-2"
            >
                {loadingMs ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 size={24} className="animate-spin text-primary" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-surface-hover text-fg-muted">
                            <MessageCircle size={26} strokeWidth={1.5} />
                        </div>
                        <p className="font-semibold mb-1 text-fg">{searchQuery ? t('chat.noMessagesFound') : t('chat.noMessagesYet')}</p>
                        <p className="text-sm text-fg-secondary">
                            {searchQuery ? t('chat.tryDifferentSearch') : t('chat.beFirst')}
                        </p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {messages.map((msg, idx) => {
                            const isOwn = msg.user_id === user?.id;
                            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(msg.file_type?.toLowerCase());
                            const FileIcon = getFileIcon(msg.file_type);
                            const reactions = groupReactions(msg.reactions, user?.id);
                            const canDelete = isOwn || isAdmin;
                            // A divider whenever the calendar day changes, and
                            // before the very first message.
                            const showDayDivider = idx === 0
                                || dayKey(msg.created_at) !== dayKey(messages[idx - 1].created_at);

                            if (msg.is_deleted) {
                                return (
                                    <div key={msg.id} ref={el => messageRefs.current[msg.id] = el}
                                        className="flex flex-col max-w-[85%] md:max-w-[75%]"
                                        style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start' }}>
                                        {showDayDivider && (
                                            <div className="self-center my-3 px-3 py-1 rounded-full text-xs font-medium bg-surface-hover text-fg-secondary">
                                                {formatDayLabel(msg.created_at)}
                                            </div>
                                        )}
                                        <div className="px-4 py-2.5 rounded-2xl text-sm italic border border-dashed border-border text-fg-muted flex items-center gap-2">
                                            <Ban size={13} /> {t('chat.messageDeleted')}
                                        </div>
                                        <span className="text-xs mt-1 px-1 text-fg-muted">{formatTime(msg.created_at)}</span>
                                    </div>
                                );
                            }

                            return (
                                <motion.div
                                    key={msg.id}
                                    ref={el => messageRefs.current[msg.id] = el}
                                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                                    animate={{ opacity: msg._pending ? 0.65 : 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.22, ease: [0.22,1,0.36,1] }}
                                    className="flex flex-col max-w-[85%] md:max-w-[75%] message-bubble"
                                    style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start' }}
                                >
                                    {showDayDivider && (
                                        <div className="self-center my-3 px-3 py-1 rounded-full text-xs font-medium bg-surface-hover text-fg-secondary">
                                            {formatDayLabel(msg.created_at)}
                                        </div>
                                    )}

                                    {!isOwn && (
                                        <span className="text-xs font-semibold mb-1 ml-1 text-primary">
                                            {msg.users?.first_name} {msg.users?.last_name}
                                        </span>
                                    )}

                                    {/* Reply preview */}
                                    {msg.group_messages && (
                                        <div
                                            className="text-xs px-3 py-1.5 mb-1 rounded-lg border-l-2 border-primary bg-bg text-fg-secondary cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => scrollToMessage(msg.reply_to)}
                                        >
                                            <div className="font-semibold text-primary">
                                                {msg.group_messages.users?.first_name} {msg.group_messages.users?.last_name}
                                            </div>
                                            <div className="truncate">{msg.group_messages.message || '(file)'}</div>
                                        </div>
                                    )}

                                    <div
                                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isOwn ? 'text-white rounded-br-md' : 'border border-border bg-surface text-fg rounded-bl-md'}`}
                                        style={isOwn ? { background: 'var(--gradient-primary)' } : undefined}
                                    >
                                        {editingMsg?.id === msg.id ? (
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={editText}
                                                    onChange={e => setEditText(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleEdit(msg);
                                                        if (e.key === 'Escape') cancelEdit();
                                                    }}
                                                    className={`flex-1 bg-transparent border-b outline-none ${isOwn ? 'border-white/30' : 'border-border'}`}
                                                    autoFocus
                                                />
                                                <button onClick={() => handleEdit(msg)} className="hover:scale-110 transition-transform">
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={cancelEdit} className="hover:scale-110 transition-transform">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                {msg.message && <div>{msg.message}</div>}

                                                {/* File attachment */}
                                                {msg.file_url && (
                                                    <div className="mt-2">
                                                        {isImage ? (
                                                            <img
                                                                src={mediaUrl(msg.file_url)}
                                                                alt={t('chat.attachment')}
                                                                className="rounded-lg max-w-xs cursor-pointer hover:opacity-90 transition-opacity"
                                                                onClick={() => setFullImageView(msg.file_url)}
                                                            />
                                                        ) : (
                                                            <a
                                                                href={mediaUrl(msg.file_url)}
                                                                download
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 transition-opacity ${isOwn ? 'bg-white/15' : 'border border-border bg-bg'}`}
                                                            >
                                                                <FileIcon size={18} />
                                                                <span className="text-xs">Download {msg.file_type?.toUpperCase()} file</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* reaction chips */}
                                    {reactions.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1" style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start' }}>
                                            {reactions.map(r => (
                                                <button
                                                    key={r.emoji}
                                                    onClick={() => handleReact(msg, r.emoji)}
                                                    title={r.mine ? t('chat.removeReaction') : t('chat.react')}
                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                                                        r.mine
                                                            ? 'border-primary bg-primary-subtle text-primary'
                                                            : 'border-border bg-surface text-fg-secondary hover:border-primary'
                                                    }`}
                                                >
                                                    <span>{r.emoji}</span>
                                                    <span className="font-semibold">{r.count}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* reaction picker */}
                                    {reactionPickerFor === msg.id && (
                                        <div
                                            className="flex gap-1 mt-1 p-1.5 rounded-full border border-border bg-surface-raised shadow-lg"
                                            style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start' }}
                                        >
                                            {QUICK_REACTIONS.map(e => (
                                                <button
                                                    key={e}
                                                    onClick={() => handleReact(msg, e)}
                                                    className="w-7 h-7 rounded-full text-base leading-none hover:bg-surface-hover hover:scale-110 transition-all"
                                                    aria-label={`React with ${e}`}
                                                >
                                                    {e}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 mt-1 px-1">
                                        <span className="text-xs text-fg-secondary">
                                            {formatTime(msg.created_at)}
                                            {msg._pending && ' · sending…'}
                                            {msg.is_edited && ` · ${t('chat.edited')}`}
                                        </span>
                                        {!msg._pending && !editingMsg && (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setReplyTo(msg)}
                                                    className="p-1 rounded text-fg-secondary hover:bg-primary-solid hover:text-white transition-colors"
                                                    title={t('chat.replyToMessage')}
                                                >
                                                    <Reply size={12} />
                                                </button>
                                                <button
                                                    onClick={() => setReactionPickerFor(v => (v === msg.id ? null : msg.id))}
                                                    className="p-1 rounded text-fg-secondary hover:bg-primary-solid hover:text-white transition-colors"
                                                    title={t('chat.reactToMessage')}
                                                >
                                                    <SmilePlus size={12} />
                                                </button>
                                                {canEdit(msg) && (
                                                    <button
                                                        onClick={() => startEdit(msg)}
                                                        className="p-1 rounded text-fg-secondary hover:bg-primary-solid hover:text-white transition-colors"
                                                        title={t('chat.editMessage')}
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                )}
                                                {/* Authors delete their own; group owners/admins can
                                                    remove anyone's, as a moderator would. */}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(msg)}
                                                        className="p-1 rounded text-fg-secondary hover:bg-danger hover:text-white transition-colors"
                                                        title={isOwn ? t('chat.deleteMessage') : t('chat.deleteAsAdmin')}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
                <div ref={bottomRef} />

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="text-xs px-3 py-1.5 self-start text-fg-secondary"
                    >
                        {typingUsers.length === 1
                            ? `${typingUsers[0].first_name} is typing...`
                            : typingUsers.length === 2
                            ? `${typingUsers[0].first_name} and ${typingUsers[1].first_name} are typing...`
                            : `${typingUsers.length} people are typing...`}
                    </motion.div>
                )}
            </div>
            </div>

            {/* ── INPUT ───────────────────────────────────────── */}
            <div className="px-3 sm:px-5 py-3 sm:py-4 border-t border-border bg-surface shrink-0">
                {/* Reply preview bar */}
                {replyTo && (
                    <div className="flex items-center justify-between mb-2 px-3 py-2 rounded-lg bg-bg">
                        <div className="text-xs">
                            <span className="font-semibold text-primary">
                                {t('chat.replyingTo', { name: replyTo.users?.first_name ?? '' })}
                            </span>
                            <div className="truncate text-fg-secondary">
                                {replyTo.message || t('chat.file')}
                            </div>
                        </div>
                        <button onClick={() => setReplyTo(null)} aria-label={t('chat.cancelReply')} className="p-1 rounded hover:bg-danger hover:text-white transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* File preview */}
                {selectedFile && (
                    <div className="flex items-center justify-between mb-2 px-3 py-2 rounded-lg bg-bg">
                        <div className="flex items-center gap-2 text-xs text-fg-secondary">
                            <Paperclip size={14} />
                            <span>{selectedFile.name}</span>
                        </div>
                        <button onClick={() => setSelectedFile(null)} aria-label={t('chat.removeAttachment')} className="p-1 rounded hover:bg-danger hover:text-white transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                )}

                <form onSubmit={handleSend} className="flex gap-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!isOnline}
                        className="p-2.5 rounded-full transition-colors disabled:opacity-50 text-fg-secondary hover:bg-primary-solid hover:text-white"
                        title={t('chat.attachFile')}
                    >
                        <Paperclip size={18} />
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        onFocus={() => { inputFocused.current = true; }}
                        onBlur={() => { inputFocused.current = false; }}
                        placeholder={isOnline ? t('chat.messagePlaceholder') : t('chat.offlinePlaceholder')}
                        autoComplete="off"
                        disabled={!isOnline}
                        className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none border-2 bg-bg text-fg border-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:border-primary"
                    />
                    <motion.button
                        type="submit"
                        disabled={sending || (!input.trim() && !selectedFile) || !isOnline}
                        whileHover={isOnline ? { scale: 1.05 } : {}}
                        whileTap={isOnline ? { scale: 0.93 } : {}}
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-50 shrink-0"
                        style={{ background: 'var(--gradient-primary)' }}
                        aria-label={t('chat.sendMessage')}
                        title={!isOnline ? t('chat.offlineSendTitle') : t('chat.sendMessage')}
                    >
                        {!isOnline
                            ? <WifiOff size={16} />
                            : sending
                            ? <Loader2 size={16} className="animate-spin" />
                            : <Send size={16} />
                        }
                    </motion.button>
                </form>
            </div>

            {/* Full-size image modal */}
            {fullImageView && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85"
                    onClick={() => setFullImageView(null)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 rounded-full text-white hover:bg-white/20 transition-colors"
                        onClick={() => setFullImageView(null)}
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={mediaUrl(fullImageView)}
                        alt="Full size"
                        className="max-w-full max-h-full rounded-lg"
                        onClick={e => e.stopPropagation()}
                    />
                </motion.div>
            )}
        </div>
    );
}
