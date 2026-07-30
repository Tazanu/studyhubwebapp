import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import StudyHubLogo from './StudyHubLogo';

const DASHBOARD_ROUTES = ['/dashboard', '/groups', '/notes', '/qa', '/tutors', '/profile', '/settings', '/become-tutor', '/admin', '/premium'];

export default function Navbar() {
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const isDash = DASHBOARD_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));

    const handleLogout = () => { logout(); navigate('/'); };

    return (
        <nav
            className={`fixed top-0 z-40 border-b py-3 flex items-center justify-between ${isDash ? 'lg:left-60' : ''}`}
            style={{
                left:           isDash ? undefined : 0,
                right:          0,
                paddingLeft:    isDash ? '1rem' : '3.5rem',
                paddingRight:   '1.5rem',
                background:     theme === 'dark' ? 'rgba(18,18,18,0.98)' : 'rgba(255,255,255,0.98)',
                borderColor:    'var(--border-subtle)',
                backdropFilter: 'blur(12px)',
            }}
        >
            {/* logo — only shown on public pages; dashboard has it in sidebar */}
            {!isDash && (
                <Link to="/" className="flex items-center">
                    <StudyHubLogo size="md" showText={true} />
                </Link>
            )}

            {/* public nav links */}
            {!isDash && (
                <ul className="hidden md:flex gap-8 list-none">
                    {[['Home', '/'], ['About', '/about']].map(([label, path]) => (
                        <li key={path}>
                            <Link to={path} className="font-medium transition-colors" style={{ color: 'var(--text-secondary)' }}>
                                {label}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {/* dashboard page title placeholder — keeps topbar from being empty */}
            {isDash && <div />}

            <div className="flex items-center gap-1.5 sm:gap-3">
                {user && isDash && <NotificationBell />}
                <button
                    onClick={toggleTheme}
                    className="w-11 h-11 rounded-full border-2 flex items-center justify-center text-lg transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:rotate-180 shrink-0"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', background: 'var(--bg-card)' }}
                    aria-label="Toggle theme"
                >
                    {theme === 'light' ? '☀️' : '🌙'}
                </button>

                {user ? (
                    !isDash && (
                        <>
                            <Link to="/dashboard"
                                className="px-3 sm:px-4 py-2 rounded-lg font-semibold border-2 transition-all hover:bg-blue-600 hover:text-white text-xs sm:text-sm text-center whitespace-nowrap"
                                style={{ borderColor: 'var(--accent-blue)', color: 'var(--text-primary)' }}>
                                Dashboard
                            </Link>
                            <button onClick={handleLogout}
                                className="px-3 sm:px-4 py-2 rounded-lg font-semibold border-2 transition-all hover:bg-red-500 hover:text-white hover:border-red-500 text-xs sm:text-sm whitespace-nowrap"
                                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                                <span className="hidden sm:inline">Logout</span>
                                <span className="sm:hidden">↩</span>
                            </button>
                        </>
                    )
                ) : (
                    <>
                        <Link to="/login"
                            className="px-4 py-2 rounded-lg font-semibold border-2 transition-all hover:bg-blue-600 hover:text-white text-center text-sm"
                            style={{ borderColor: 'var(--accent-blue)', color: 'var(--text-primary)' }}>
                            Log in
                        </Link>
                        <Link to="/register"
                            className="px-4 sm:px-6 py-2 rounded-lg font-semibold text-white transition-all hover:-translate-y-0.5 text-center text-sm"
                            style={{ background: 'linear-gradient(135deg, #0052cc 0%, #0066ff 100%)' }}>
                            Sign Up
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}
