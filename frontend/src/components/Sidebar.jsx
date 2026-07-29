import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Users, FileText, MessageSquare,
    GraduationCap, User, Settings, LogOut, Menu, X, ShieldCheck, Crown, BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import StudyHubLogo from './StudyHubLogo';

const BASE_NAV = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/groups',    icon: Users,           label: 'My Groups' },
    { to: '/notes',     icon: FileText,        label: 'My Notes'  },
    { to: '/qa',        icon: MessageSquare,   label: 'Q&A Forum' },
    { to: '/tutors',    icon: GraduationCap,   label: 'Tutors'    },
    { to: '/profile',   icon: User,            label: 'Profile'   },
    { to: '/settings',  icon: Settings,        label: 'Settings'  },
];

function NavItem({ to, icon: Icon, label, onClick }) {
    const { pathname } = useLocation();
    const active = pathname === to;
    const [hovered, setHovered] = useState(false);

    return (
        <Link
            to={to}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
                color: active ? '#fff' : 'var(--text-secondary)',
                zIndex: 1,
                outlineColor: 'var(--accent-blue)',
            }}
        >
            {/* active background pill — animates between items */}
            {active && (
                <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'var(--accent-blue)', zIndex: -1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
            )}
            {/* hover background */}
            {!active && hovered && (
                <motion.span
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'var(--bg-hover)', zIndex: -1 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                />
            )}
            {/* icon with micro-bounce on hover */}
            <motion.span
                animate={hovered && !active ? { y: -2, scale: 1.15 } : { y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                style={{ display: 'flex', alignItems: 'center' }}
            >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.75} />
            </motion.span>
            {label}
        </Link>
    );
}

function SidebarContent({ onClose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [logoutHover, setLogoutHover] = useState(false);

    const NAV = [
        ...BASE_NAV,
        { to: '/premium', icon: Crown, label: 'Premium' },
        ...(user?.tutor_status ? [{ to: '/tutor-dashboard', icon: BookOpen, label: 'Tutor Dashboard' }] : []),
        ...(user?.role === 'admin' ? [{ to: '/admin', icon: ShieldCheck, label: 'Admin' }] : []),
    ];

    const handleLogout = () => { logout(); navigate('/'); };

    return (
        <div className="flex flex-col h-full">
            {/* logo */}
            <div className="flex items-center justify-between px-4 py-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <Link to="/" className="flex items-center" onClick={onClose}>
                    <StudyHubLogo size="sm" showText={true} />
                </Link>
                {onClose && (
                    <motion.button
                        onClick={onClose}
                        whileHover={{ rotate: 90, scale: 1.1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                        className="p-1 rounded-lg"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <X size={20} />
                    </motion.button>
                )}
            </div>

            {/* nav */}
            <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
                {NAV.map(item => <NavItem key={item.to} {...item} onClick={onClose} />)}
            </nav>

            {/* user footer */}
            <div className="px-3 py-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <motion.div
                    className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl"
                    style={{ background: 'var(--bg-hover)' }}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                    <motion.div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg, #0052cc, #0066ff)' }}
                        whileHover={{ scale: 1.15 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </motion.div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{user?.first_name} {user?.last_name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{user?.field_of_study}</p>
                    </div>
                </motion.div>
                <motion.button
                    onClick={handleLogout}
                    onHoverStart={() => setLogoutHover(true)}
                    onHoverEnd={() => setLogoutHover(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium focus-visible:outline focus-visible:outline-2"
                    animate={{
                        background: logoutHover ? 'rgba(239,68,68,0.1)' : 'transparent',
                        color: logoutHover ? '#ef4444' : 'var(--text-secondary)',
                    }}
                    transition={{ duration: 0.18 }}
                    style={{ outlineColor: 'var(--accent-blue)' }}
                >
                    <motion.span
                        animate={logoutHover ? { x: -3 } : { x: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        style={{ display: 'flex' }}
                    >
                        <LogOut size={18} strokeWidth={1.75} />
                    </motion.span>
                    Log out
                </motion.button>
            </div>
        </div>
    );
}

export default function Sidebar() {
    const [open, setOpen] = useState(false);
    const { theme } = useTheme();
    const bg = theme === 'dark' ? 'rgba(18,18,18,0.98)' : 'rgba(255,255,255,0.98)';

    return (
        <>
            {/* mobile hamburger */}
            <motion.button
                onClick={() => setOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 rounded-xl border flex items-center justify-center"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                aria-label="Open menu"
            >
                <Menu size={20} />
            </motion.button>

            {/* desktop sidebar */}
            <aside
                className="hidden lg:flex flex-col fixed top-0 left-0 h-full w-60 border-r z-40"
                style={{ background: bg, borderColor: 'var(--border-subtle)' }}
            >
                <SidebarContent />
            </aside>

            {/* mobile drawer with AnimatePresence */}
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            key="overlay"
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setOpen(false)}
                        />
                        <motion.aside
                            key="drawer"
                            className="fixed top-0 left-0 h-full w-72 z-50 flex flex-col border-r lg:hidden"
                            style={{ background: bg, borderColor: 'var(--border-subtle)' }}
                            initial={{ x: -288 }}
                            animate={{ x: 0 }}
                            exit={{ x: -288 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                        >
                            <SidebarContent onClose={() => setOpen(false)} />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
