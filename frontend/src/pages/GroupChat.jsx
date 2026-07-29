import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, RefreshCw, Loader2, WifiOff, Paperclip, X, Image as ImageIcon, FileText, File, Reply, Edit2, Check, Search, Settings, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import JoinRequestsPanel from '../components/JoinRequestsPanel';

const POLL_MS = 4000;
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function GroupChat() {
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

    /* ── load group info once on mount ───────────────────────── */
    useEffect(() => {
        api.get(`/groups/${id}`)
            .then(({ data }) => {
                console.log('Group data loaded:', data);
                console.log('Current user ID:', user?.id);
                setGroup(data);
                setEditGroupForm({ name: data.name || '', description: data.description || '' });
                // Check if current user is admin
                const membership = data.user_groups?.find(ug => ug.user_id === user?.id);
                console.log('Found membership:', membership);
                const adminStatus = membership?.role === 'owner' || membership?.role === 'admin';
                console.log('Is admin:', adminStatus);
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
                toast.error('You are not a member of this group');
                navigate('/groups');
            }
        } finally {
            setLoadingMs(false);
            setRefreshing(false);
        }
    }, [id, navigate]);

    useEffect(() => { loadMessages(); }, [loadMessages]);

    /* ── poll every 6s, paused while input is focused ────────── */
    useEffect(() => {
        const timer = setInterval(() => {
            if (!inputFocused.current) {
                loadMessages(true);
                // Update read status periodically
                api.post(`/groups/${id}/read`).catch(() => {});
            }
            // Poll typing status every interval
            api.get(`/groups/${id}/typing`)
                .then(({ data }) => setTypingUsers(data.typing || []))
                .catch(() => {});
        }, POLL_MS);
        return () => clearInterval(timer);
    }, [loadMessages, id]);

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
        if (!editGroupForm.name.trim()) return toast.error('Group name is required');
        setEditGroupSaving(true);
        try {
            const { data } = await api.patch(`/groups/${id}`, editGroupForm);
            setGroup(prev => ({ ...prev, ...data }));
            setShowEditGroup(false);
            toast.success('Group updated!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update group');
        } finally {
            setEditGroupSaving(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!window.confirm('Delete this group permanently? This cannot be undone.')) return;
        try {
            await api.delete(`/groups/${id}`);
            toast.success('Group deleted');
            navigate('/groups');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete group');
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
            toast.error(err.response?.data?.error || 'Failed to send message');
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
            toast.success('Message edited');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to edit message');
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
        
        // Send typing signal
        api.post(`/groups/${id}/typing`).catch(() => {});
        
        // Clear typing after 3s of inactivity
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            // Typing stopped (no explicit endpoint needed, will expire after 5s)
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
        <div className="lg:pl-60 flex flex-col" style={{ height: 'calc(100dvh - 65px)', marginTop: '65px', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>

            {/* ── HEADER ──────────────────────────────────────── */}
            <div className="border-b shrink-0" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                        <Link to="/groups"
                            className="p-2 rounded-lg transition-colors hover:bg-blue-500 hover:text-white"
                            style={{ color: 'var(--text-secondary)' }}
                            aria-label="Back to groups">
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <h2 className="font-semibold text-sm leading-tight"
                                style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                                {group?.name ?? 'Group Chat'}
                            </h2>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {group?.current_members ?? '…'} members · {group?.subject}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <button
                                onClick={() => setShowEditGroup(v => !v)}
                                className="p-2 rounded-lg transition-colors"
                                style={{ color: showEditGroup ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
                                title="Edit group"
                            >
                                <Settings size={16} />
                            </button>
                        )}
                        <button
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: searchOpen ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
                            aria-label="Search messages"
                            title="Search messages"
                        >
                            <Search size={16} />
                        </button>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2 rounded-lg transition-colors disabled:opacity-50"
                            style={{ color: 'var(--text-secondary)' }}
                            aria-label="Refresh messages"
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
                            className="border-b overflow-hidden"
                            style={{ background: 'var(--bg-hover)', borderColor: 'var(--border-subtle)' }}
                        >
                            <form onSubmit={handleEditGroup} className="px-5 py-4 flex flex-col gap-3">
                                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Edit Group</p>
                                <input
                                    value={editGroupForm.name}
                                    onChange={e => setEditGroupForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Group name"
                                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                                    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                                />
                                <textarea
                                    value={editGroupForm.description}
                                    onChange={e => setEditGroupForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Description"
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                                    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                                />
                                <div className="flex gap-2">
                                    <button type="submit" disabled={editGroupSaving}
                                        className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                                        style={{ background: 'var(--accent-blue)' }}>
                                        {editGroupSaving ? 'Saving…' : 'Save'}
                                    </button>
                                    <button type="button" onClick={handleDeleteGroup}
                                        className="px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5"
                                        style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>
                                        <Trash2 size={13} /> Delete Group
                                    </button>
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
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        handleSearch(e.target.value);
                                    }}
                                    placeholder="Search messages..."
                                    className="w-full pl-9 pr-9 py-2 rounded-lg text-sm outline-none border transition-all"
                                    style={{
                                        background: 'var(--bg-main)',
                                        borderColor: 'var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                    }}
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            loadMessages();
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-red-500 hover:text-white transition-colors"
                                        style={{ color: 'var(--text-secondary)' }}
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
                    className="absolute bottom-3 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg"
                    style={{ background: 'var(--accent-blue)' }}
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
                        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <p className="text-4xl mb-3">💬</p>
                        <p className="font-semibold mb-1">{searchQuery ? 'No messages found' : 'No messages yet'}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {searchQuery ? 'Try a different search term' : 'Be the first to say something!'}
                        </p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {messages.map(msg => {
                            const isOwn = msg.user_id === user?.id;
                            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(msg.file_type?.toLowerCase());
                            const FileIcon = getFileIcon(msg.file_type);

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
                                    {!isOwn && (
                                        <span className="text-xs font-semibold mb-1 ml-1"
                                            style={{ color: 'var(--accent-blue)' }}>
                                            {msg.users?.first_name} {msg.users?.last_name}
                                        </span>
                                    )}

                                    {/* Reply preview */}
                                    {msg.group_messages && (
                                        <div
                                            className="text-xs px-3 py-1.5 mb-1 rounded-lg border-l-2 cursor-pointer hover:opacity-80 transition-opacity"
                                            style={{
                                                background: 'var(--bg-main)',
                                                borderColor: 'var(--accent-blue)',
                                                color: 'var(--text-secondary)',
                                            }}
                                            onClick={() => scrollToMessage(msg.reply_to)}
                                        >
                                            <div className="font-semibold" style={{ color: 'var(--accent-blue)' }}>
                                                {msg.group_messages.users?.first_name} {msg.group_messages.users?.last_name}
                                            </div>
                                            <div className="truncate">{msg.group_messages.message || '(file)'}</div>
                                        </div>
                                    )}

                                    <div
                                        className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                                        style={isOwn
                                            ? { background: 'linear-gradient(135deg,#0052cc,#0066ff)', color: '#fff',
                                                borderBottomRightRadius: 6 }
                                            : { background: 'var(--bg-card)', color: 'var(--text-primary)',
                                                border: '1px solid var(--border-subtle)', borderBottomLeftRadius: 6 }
                                        }
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
                                                    className="flex-1 bg-transparent border-b outline-none"
                                                    style={{ borderColor: isOwn ? 'rgba(255,255,255,0.3)' : 'var(--border-subtle)' }}
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
                                                                src={`${API_ORIGIN}${msg.file_url}`}
                                                                alt="attachment"
                                                                className="rounded-lg max-w-xs cursor-pointer hover:opacity-90 transition-opacity"
                                                                onClick={() => setFullImageView(msg.file_url)}
                                                            />
                                                        ) : (
                                                            <a
                                                                href={`${API_ORIGIN}${msg.file_url}`}
                                                                download
                                                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 transition-opacity"
                                                                style={{
                                                                    background: isOwn ? 'rgba(255,255,255,0.15)' : 'var(--bg-main)',
                                                                    border: isOwn ? 'none' : '1px solid var(--border-subtle)',
                                                                }}
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

                                    <div className="flex items-center gap-2 mt-1 px-1">
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            {formatTime(msg.created_at)}
                                            {msg._pending && ' · sending…'}
                                            {msg.is_edited && ' · (edited)'}
                                        </span>
                                        {isOwn && !msg._pending && (
                                            <div className="flex gap-1">
                                                {!editingMsg && (
                                                    <button
                                                        onClick={() => setReplyTo(msg)}
                                                        className="p-1 rounded hover:bg-blue-500 hover:text-white transition-colors"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                        title="Reply to this message"
                                                    >
                                                        <Reply size={12} />
                                                    </button>
                                                )}
                                                {canEdit(msg) && !editingMsg && (
                                                    <button
                                                        onClick={() => startEdit(msg)}
                                                        className="p-1 rounded hover:bg-blue-500 hover:text-white transition-colors"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                        title="Edit message (15min window)"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {!isOwn && !msg._pending && !editingMsg && (
                                            <button
                                                onClick={() => setReplyTo(msg)}
                                                className="p-1 rounded hover:bg-blue-500 hover:text-white transition-colors"
                                                style={{ color: 'var(--text-secondary)' }}
                                                title="Reply to this message"
                                            >
                                                <Reply size={12} />
                                            </button>
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
                        className="text-xs px-3 py-1.5 self-start"
                        style={{ color: 'var(--text-secondary)' }}
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
            <div className="px-3 sm:px-5 py-3 sm:py-4 border-t shrink-0" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                {/* Reply preview bar */}
                {replyTo && (
                    <div className="flex items-center justify-between mb-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-main)' }}>
                        <div className="text-xs">
                            <span className="font-semibold" style={{ color: 'var(--accent-blue)' }}>
                                Replying to {replyTo.users?.first_name}
                            </span>
                            <div className="truncate" style={{ color: 'var(--text-secondary)' }}>
                                {replyTo.message || '(file)'}
                            </div>
                        </div>
                        <button onClick={() => setReplyTo(null)} className="p-1 rounded hover:bg-red-500 hover:text-white transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* File preview */}
                {selectedFile && (
                    <div className="flex items-center justify-between mb-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-main)' }}>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <Paperclip size={14} />
                            <span>{selectedFile.name}</span>
                        </div>
                        <button onClick={() => setSelectedFile(null)} className="p-1 rounded hover:bg-red-500 hover:text-white transition-colors">
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
                        className="p-2.5 rounded-full transition-colors disabled:opacity-50"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={e => !isOnline ? null : e.target.style.background = 'var(--accent-blue)' || (e.target.style.color = '#fff')}
                        onMouseLeave={e => !isOnline ? null : (e.target.style.background = 'transparent', e.target.style.color = 'var(--text-secondary)')}
                        title="Attach file"
                    >
                        <Paperclip size={18} />
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        onFocus={() => (inputFocused.current = true)}
                        onBlur={() => (inputFocused.current = false)}
                        placeholder={isOnline ? "Type a message…" : "Offline — reconnect to send messages"}
                        autoComplete="off"
                        disabled={!isOnline}
                        className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: 'var(--bg-main)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                        }}
                        onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
                    />
                    <motion.button
                        type="submit"
                        disabled={sending || (!input.trim() && !selectedFile) || !isOnline}
                        whileHover={isOnline ? { scale: 1.05 } : {}}
                        whileTap={isOnline ? { scale: 0.93 } : {}}
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-50 shrink-0"
                        style={{ background: 'linear-gradient(135deg,#0052cc,#0066ff)' }}
                        aria-label="Send message"
                        title={!isOnline ? "You're offline — reconnect to send" : "Send message"}
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
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.85)' }}
                    onClick={() => setFullImageView(null)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 rounded-full text-white hover:bg-white hover:bg-opacity-20 transition-colors"
                        onClick={() => setFullImageView(null)}
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={`${API_ORIGIN}${fullImageView}`}
                        alt="Full size"
                        className="max-w-full max-h-full rounded-lg"
                        onClick={e => e.stopPropagation()}
                    />
                </motion.div>
            )}
        </div>
    );
}
