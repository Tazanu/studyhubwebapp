import { useState, useEffect } from 'react';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showPanel, setShowPanel] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const { data } = await api.get('/notifications/mine');
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch {
            // Silently ignore — 401 handled globally
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
    }, [user]);

    const handleMarkRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            fetchNotifications();
        } catch {}
    };

    const handleNotificationClick = (notif) => {
        handleMarkRead(notif.id);
        setShowPanel(false);
        const { type, related_group_id } = notif;
        if (type === 'join_request' && related_group_id) {
            navigate(`/groups/${related_group_id}/chat`);
        } else if (type === 'request_approved' && related_group_id) {
            navigate(`/groups/${related_group_id}/chat`);
        } else if (type === 'request_denied') {
            navigate('/groups');
        } else if (related_group_id) {
            navigate(`/groups/${related_group_id}/chat`);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.post('/notifications/mark-all-read');
            fetchNotifications();
        } catch {}
    };

    const typeIcon = (type) => {
        if (type === 'join_request')     return '👋';
        if (type === 'request_approved') return '✅';
        if (type === 'request_denied')   return '❌';
        return '🔔';
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowPanel(!showPanel)}
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 relative"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', background: 'var(--bg-card)' }}
            >
                🔔
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {showPanel && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
                    <div
                        className="absolute right-0 mt-2 w-screen max-w-sm rounded-xl border shadow-xl z-50 max-h-[28rem] overflow-y-auto"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', minWidth: '280px' }}
                    >
                        {/* header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
                            {notifications.length > 0 && (
                                <button onClick={handleMarkAllRead} className="text-xs font-medium" style={{ color: 'var(--accent-blue)' }}>
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                                No notifications
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className="flex items-start gap-3 px-4 py-3 border-b cursor-pointer transition-colors hover:bg-blue-500/5"
                                    style={{
                                        borderColor: 'var(--border-subtle)',
                                        background: notif.is_read ? 'transparent' : 'rgba(0,82,204,0.07)',
                                    }}
                                >
                                    {/* type icon */}
                                    <span className="text-base shrink-0 mt-0.5">{typeIcon(notif.type)}</span>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                                            {notif.message}
                                        </p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                            {new Date(notif.created_at).toLocaleString()}
                                        </p>
                                        {/* actionable hint — only on unread join requests */}
                                        {notif.type === 'join_request' && !notif.is_read && (
                                            <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--accent-blue)' }}>
                                                Tap to approve or deny →
                                            </p>
                                        )}
                                    </div>

                                    {/* unread dot */}
                                    {!notif.is_read && (
                                        <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: 'var(--accent-blue)' }} />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
