import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
    const bellRef = useRef(null);
    const [anchor, setAnchor] = useState(null);

    /**
     * Measure the bell so the portal can be placed next to it.
     *
     * The panel is rendered into document.body rather than beside the bell,
     * because `position: fixed` resolves against the nearest ancestor carrying
     * a transform rather than the viewport. One of the navbar's ancestors has
     * one, which collapsed the panel to the width of the navbar's right-hand
     * section — about 106px, one word per line. A portal has no such ancestor.
     */
    const placePanel = useCallback(() => {
        const r = bellRef.current?.getBoundingClientRect();
        if (r) setAnchor({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }, []);

    useEffect(() => {
        if (!showPanel) return undefined;
        placePanel();
        window.addEventListener('resize', placePanel);
        window.addEventListener('scroll', placePanel, true);
        return () => {
            window.removeEventListener('resize', placePanel);
            window.removeEventListener('scroll', placePanel, true);
        };
    }, [showPanel, placePanel]);
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
                ref={bellRef}
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

            {showPanel && anchor && createPortal(
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
                    {/* Full-width sheet on a phone, anchored dropdown from sm up.
                        Positioned from the bell's measured rect because this is
                        portalled to document.body, away from the transformed
                        ancestor that was containing `fixed`. */}
                    <div
                        style={{
                            top: anchor.top,
                            right: window.innerWidth < 640 ? 12 : anchor.right,
                            left: window.innerWidth < 640 ? 12 : 'auto',
                            width: window.innerWidth < 640 ? 'auto' : 'min(26rem, calc(100vw - 24px))',
                        }}
                        className="fixed rounded-xl border border-border bg-surface-raised shadow-xl z-50 max-h-[70vh] sm:max-h-[28rem] overflow-y-auto overscroll-contain">
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
                </>,
                document.body,
            )}
        </div>
    );
}
