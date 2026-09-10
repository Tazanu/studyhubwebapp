import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import StudyHubLogo from './StudyHubLogo';
import Button from './ui/Button';
import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle';

const DASHBOARD_ROUTES = ['/dashboard', '/groups', '/notes', '/qa', '/tutors', '/profile', '/settings', '/become-tutor', '/admin', '/premium'];

export default function Navbar() {
    const { t } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const isDash = DASHBOARD_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));

    const handleLogout = () => { logout(); navigate('/'); };

    return (
        <nav
            className={`fixed top-0 z-40 border-b border-border py-3 flex items-center justify-between bg-surface/95 backdrop-blur-md ${isDash ? 'lg:left-60' : ''}`}
            style={{
                left:           isDash ? undefined : 0,
                right:          0,
                paddingLeft:    isDash ? '1rem' : undefined,
                paddingRight:   '1.5rem',
            }}
        >
            {/* logo — only shown on public pages; dashboard has it in sidebar */}
            {!isDash && (
                <Link to="/" className="flex items-center ml-6 sm:ml-8">
                    <StudyHubLogo size="lg" showText={true} />
                </Link>
            )}

            {/* public nav links */}
            {!isDash && (
                <ul className="hidden md:flex gap-8 list-none">
                    {[['Home', '/'], ['About', '/about']].map(([label, path]) => (
                        <li key={path}>
                            <Link to={path} className="font-medium transition-colors text-fg-secondary hover:text-fg">
                                {label}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {/* dashboard page title placeholder — keeps topbar from being empty */}
            {isDash && <div />}

            <div className="flex items-center gap-1.5 sm:gap-3">
                <LanguageToggle compact />
                {user && isDash && <NotificationBell />}
                <button
                    onClick={toggleTheme}
                    className="w-11 h-11 rounded-full border-2 border-border bg-surface text-fg flex items-center justify-center transition-all hover:bg-primary-solid hover:text-white hover:border-primary shrink-0"
                    aria-label={t('nav.toggleTheme')}
                >
                    {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {user ? (
                    !isDash && (
                        <>
                            <Button to="/dashboard" variant="outline" size="sm" icon={LayoutDashboard} className="whitespace-nowrap">
                                <span className="hidden sm:inline">{t('nav.dashboard')}</span>
                            </Button>
                            <button onClick={handleLogout}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-md font-semibold border-2 border-border text-fg transition-all hover:bg-danger hover:text-white hover:border-danger text-xs sm:text-sm whitespace-nowrap">
                                <LogOut size={15} />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </>
                    )
                ) : (
                    <>
                        <Button to="/login" variant="outline" size="sm">
                            {t('nav.login')}
                        </Button>
                        <Button to="/register" size="sm" className="hover:-translate-y-0.5">
                            {t('nav.signup')}
                        </Button>
                    </>
                )}
            </div>
        </nav>
    );
}
