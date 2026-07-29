import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useState, useEffect, lazy, Suspense } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import UpdateNotification from './components/UpdateNotification';
import OfflineBanner from './components/OfflineBanner';
import InstallPrompt from './components/InstallPrompt';

// Eagerly loaded — always needed on first paint
import Home     from './pages/Home';
import Login    from './pages/Login';
import Register from './pages/Register';

// Lazy loaded — split into separate chunks
const About          = lazy(() => import('./pages/About'));
const Terms          = lazy(() => import('./pages/Terms'));
const Privacy        = lazy(() => import('./pages/Privacy'));
const Dashboard      = lazy(() => import('./pages/Dashboard'));
const Profile        = lazy(() => import('./pages/Profile'));
const Groups         = lazy(() => import('./pages/Groups'));
const GroupChat      = lazy(() => import('./pages/GroupChat'));
const Notes          = lazy(() => import('./pages/Notes'));
const NoteDetail     = lazy(() => import('./pages/NoteDetail'));
const QAForum        = lazy(() => import('./pages/QAForum'));
const AskQuestion    = lazy(() => import('./pages/AskQuestion'));
const QuestionDetail = lazy(() => import('./pages/QuestionDetail'));
const BecomeTutor    = lazy(() => import('./pages/BecomeTutor'));
const TutorDashboard = lazy(() => import('./pages/TutorDashboard'));
const Settings       = lazy(() => import('./pages/Settings'));
const SocketTest     = lazy(() => import('./pages/SocketTest'));
const TutorProfilePage = lazy(() => import('./pages/TutorProfilePage'));
const Tutors         = lazy(() => import('./pages/Tutors'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const PremiumPage    = lazy(() => import('./pages/PremiumPage'));

const DASH_ROUTES = ['/dashboard', '/groups', '/notes', '/qa', '/tutors', '/profile', '/settings', '/become-tutor', '/socket-test', '/admin', '/premium', '/tutor-dashboard'];

const Protected = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;

function AdminRoute({ children }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
    return children;
}

function Layout() {
    const { pathname } = useLocation();
    const isDash = DASH_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));

    return (
        <>
            {isDash && <Sidebar />}
            <Navbar />
            <Suspense fallback={null}>
                <Routes>
                    {/* public */}
                    <Route path="/"         element={<Home />} />
                    <Route path="/about"    element={<About />} />
                    <Route path="/login"    element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/terms"    element={<Terms />} />
                    <Route path="/privacy"  element={<Privacy />} />

                    {/* protected */}
                    <Route path="/dashboard"           element={<Protected><Dashboard /></Protected>} />
                    <Route path="/profile"             element={<Protected><Profile /></Protected>} />
                    <Route path="/profile/:id"         element={<Profile />} />
                    <Route path="/groups"              element={<Protected><Groups /></Protected>} />
                    <Route path="/groups/:id/chat"     element={<Protected><GroupChat /></Protected>} />
                    <Route path="/notes"               element={<Protected><Notes /></Protected>} />
                    <Route path="/notes/:id"           element={<Protected><NoteDetail /></Protected>} />
                    <Route path="/qa"                  element={<Protected><QAForum /></Protected>} />
                    <Route path="/qa/ask"              element={<Protected><AskQuestion /></Protected>} />
                    <Route path="/qa/:id"              element={<Protected><QuestionDetail /></Protected>} />
                    <Route path="/settings"            element={<Protected><Settings /></Protected>} />
                    <Route path="/become-tutor"        element={<Protected><BecomeTutor /></Protected>} />
                    <Route path="/socket-test"         element={<Protected><SocketTest /></Protected>} />
                    <Route path="/tutors"              element={<Protected><Tutors /></Protected>} />
                    <Route path="/tutor/:id"           element={<Protected><TutorProfilePage /></Protected>} />
                    <Route path="/admin"               element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/premium"             element={<Protected><PremiumPage /></Protected>} />
                    <Route path="/tutor-dashboard"     element={<Protected><TutorDashboard /></Protected>} />
                </Routes>
            </Suspense>
            {!isDash && pathname !== '/' && pathname !== '/about' && pathname !== '/login' && pathname !== '/register' && pathname !== '/terms' && pathname !== '/privacy' && <Footer />}
        </>
    );
}

function App() {
    const [needRefresh, setNeedRefresh] = useState(false);
    const [offlineReady, setOfflineReady] = useState(false);
    const [updateSW, setUpdateSW] = useState(null);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            import('virtual:pwa-register').then(({ registerSW }) => {
                const updateServiceWorker = registerSW({
                    onNeedRefresh() { setNeedRefresh(true); },
                    onOfflineReady() { setOfflineReady(true); },
                    onRegistered(registration) { console.log('✅ Service Worker registered:', registration); },
                    onRegisterError(error) { console.error('❌ Service Worker registration failed:', error); },
                });
                setUpdateSW(() => updateServiceWorker);
            }).catch((err) => {
                console.warn('PWA registration not available:', err);
            });
        }
    }, []);

    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Layout />
                    <Toaster position="bottom-right" richColors closeButton />
                    {updateSW && (
                        <UpdateNotification
                            updateSW={updateSW}
                            offlineReady={offlineReady}
                            needRefresh={needRefresh}
                            setNeedRefresh={setNeedRefresh}
                            setOfflineReady={setOfflineReady}
                        />
                    )}
                    <OfflineBanner />
                    <InstallPrompt />
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
