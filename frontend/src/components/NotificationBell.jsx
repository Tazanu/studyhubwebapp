import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, UserPlus, CheckCircle2, XCircle } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';

const TYPE_ICON = {
    join_request:      UserPlus,
    request_approved:  CheckCircle2,
    request_denied:    XCircle,
};

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

    return (
        <div className="relative">
            <button
                onClick={() => setShowPanel(!showPanel)}
                className="w-10 h-10 rounded-full border-2 border-border bg-surface text-fg flex items-center justify-center transition-all hover:bg-primary-solid hover:text-white hover:border-primary relative"
                aria-label="Notifications"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {showPanel && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
                    {/* On a phone this is a sheet pinned inside the viewport.
                        It was an absolutely-positioned dropdown anchored to the
                        bell with w-screen and max-w-sm: on a narrow screen that
                        pushed its left edge past the viewport, so the start of
                        every message was cut off rather than wrapped. From sm up
                        it goes back to a normal dropdown. */}
                    <div className="fixed left-3 right-3 top-[4.5rem] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[26rem] rounded-xl border border-border bg-surface-raised shadow-xl z-50 max-h-[70vh] sm:max-h-[28rem] overflow-y-auto overscroll-contain">
                        {/* header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                            <h3 className="font-bold text-sm text-fg">Notifications</h3>
                            {notifications.length > 0 && (
                                <button onClick={handleMarkAllRead} className="text-xs font-medium text-primary">
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-sm text-fg-secondary">
                                No notifications
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                const Icon = TYPE_ICON[notif.type] ?? Bell;
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={cn(
                                            'flex items-start gap-3 px-4 py-3 border-b border-border cursor-pointer transition-colors hover:bg-primary-subtle',
                                            !notif.is_read && 'bg-primary-subtle/60',
                                        )}
                                    >
                                        {/* type icon */}
                                        <span className="shrink-0 mt-0.5 text-primary">
                                            <Icon size={16} />
                                        </span>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm leading-snug text-fg break-words whitespace-pre-line">
                                                {notif.message}
                                            </p>
                                            <p className="text-xs mt-1 text-fg-secondary">
                                                {new Date(notif.created_at).toLocaleString([], {
                                                    day: 'numeric', month: 'short',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </p>
                                            {/* actionable hint — only on unread join requests */}
                                            {notif.type === 'join_request' && !notif.is_read && (
                                                <p className="text-xs mt-1 font-semibold text-primary">
                                                    Tap to approve or deny →
                                                </p>
                                            )}
                                        </div>

                                        {/* unread dot */}
                                        {!notif.is_read && (
                                            <span className="w-2 h-2 rounded-full shrink-0 mt-1.5 bg-primary" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
