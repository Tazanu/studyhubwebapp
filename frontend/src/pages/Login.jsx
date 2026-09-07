import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, WifiOff } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Seo from '../components/Seo';

export default function Login() {
    const { login }  = useAuth();
    const navigate   = useNavigate();
    const isOnline   = useOnlineStatus();

    const saved = JSON.parse(localStorage.getItem('rememberedLogin') || 'null');
    const [email,      setEmail]      = useState(saved?.email    || '');
    const [password,   setPassword]   = useState(saved?.password || '');
    const [showPw,     setShowPw]     = useState(false);
    const [remember,   setRemember]   = useState(!!saved);
    const [errors,     setErrors]     = useState({});   // { email, password, general }
    const [touched,    setTouched]    = useState({});   // tracks which fields have been blurred
    const [loading,    setLoading]    = useState(false);

    /* ── blur-time validation ───────────────────────────────── */
    const validateField = (name, value) => {
        if (name === 'email') {
            if (!value)                          return 'Email is required';
            if (!/\S+@\S+\.\S+/.test(value))     return 'Enter a valid email address';
        }
        if (name === 'password') {
            if (!value)                          return 'Password is required';
        }
        return '';
    };

    const handleBlur = (name, value) => {
        setTouched(t => ({ ...t, [name]: true }));
        const msg = validateField(name, value);
        setErrors(e => ({ ...e, [name]: msg }));
    };

    /* ── submit ─────────────────────────────────────────────── */
    const handleSubmit = async e => {
        e.preventDefault();

        // Run full validation on submit
        const emailErr = validateField('email', email);
        const pwErr    = validateField('password', password);
        setTouched({ email: true, password: true });
        if (emailErr || pwErr) {
            setErrors({ email: emailErr, password: pwErr });
            return;
        }

        setErrors({});
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { email, password });
            if (remember) {
                localStorage.setItem('rememberedLogin', JSON.stringify({ email, password }));
            } else {
                localStorage.removeItem('rememberedLogin');
            }
            login(data.user, data.token);
            navigate('/dashboard');
        } catch (err) {
            // Keep email — only flag password field on auth failure
            setErrors({ general: err.response?.data?.error || 'Login failed. Please try again.' });
            setPassword('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 pt-20 bg-bg text-fg">
            <Seo title="Log In" description="Log in to your StudyHub account to reach your study groups, saved notes, Q&amp;A answers and tutor bookings." path="/login" />
            <div className="form-card w-full max-w-md rounded-2xl p-6 sm:p-10 border border-border bg-surface shadow-lg">
                {/* header */}
                <div className="text-center mb-8">
                    <div className="text-2xl font-bold mb-3 logo-gradient">StudyHub</div>
                    <h1 className="text-2xl font-bold mb-2 text-fg">Welcome Back</h1>
                    <p className="text-fg-secondary">Sign in to continue your learning journey</p>
                </div>

                {/* general error — aria-live so screen readers announce it */}
                <div aria-live="polite" aria-atomic="true">
                    {errors.general && (
                        <div className="mb-5 px-4 py-3 rounded-lg text-sm text-center bg-danger-bg text-danger border border-danger/25">
                            {errors.general}
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} noValidate>

                    {/* email */}
                    <Field label="Email Address" htmlFor="email" error={touched.email ? errors.email : ''}>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onBlur={e => handleBlur('email', e.target.value)}
                            placeholder="you@university.cm"
                            autoComplete="email"
                            aria-describedby={errors.email ? 'email-error' : undefined}
                            invalid={!!(errors.email && touched.email)}
                        />
                    </Field>

                    {/* password + toggle */}
                    <Field label="Password" htmlFor="password" error={touched.password ? errors.password : ''}>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onBlur={e => handleBlur('password', e.target.value)}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                aria-describedby={errors.password ? 'password-error' : undefined}
                                invalid={!!(errors.password && touched.password)}
                                className="pr-11"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors text-fg-muted hover:text-fg"
                                aria-label={showPw ? 'Hide password' : 'Show password'}
                                tabIndex={0}
                            >
                                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </Field>

                    {/* remember me — the box stays 16px visually, but a 24px
                        padded hit area meets the minimum target size without
                        making the control look oversized. */}
                    <div className="flex items-center gap-1.5 mb-7">
                        <input
                            type="checkbox"
                            id="remember"
                            checked={remember}
                            onChange={e => setRemember(e.target.checked)}
                            className="w-4 h-4 shrink-0 m-1 cursor-pointer"
                        />
                        <label htmlFor="remember" className="text-sm select-none cursor-pointer py-1 text-fg-secondary">
                            Remember me
                        </label>
                    </div>

                    {/* submit — single focal point */}
                    <Button
                        type="submit"
                        size="lg"
                        fullWidth
                        loading={loading}
                        disabled={!isOnline}
                        icon={!isOnline ? WifiOff : undefined}
                        title={!isOnline ? "You're offline — reconnect to sign in" : "Sign in to your account"}
                    >
                        {!isOnline ? "You're Offline" : loading ? 'Signing in…' : 'Sign In →'}
                    </Button>
                </form>

                {/* secondary action — visually subordinate */}
                <div className="text-center mt-6 pt-6 border-t border-border">
                    <p className="text-sm text-fg-secondary">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-semibold text-primary">
                            Create one free
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
