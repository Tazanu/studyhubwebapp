import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, WifiOff } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function FieldError({ id, msg }) {
    if (!msg) return null;
    return (
        <p id={id} role="alert" className="text-xs mt-1.5" style={{ color: 'var(--error)' }}>
            {msg}
        </p>
    );
}

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
        <div
            className="min-h-screen flex items-center justify-center px-4 pt-20"
            style={{ background: 'var(--bg-main)', color: 'var(--text-primary)' }}
        >
            <div
                className="form-card w-full max-w-md rounded-2xl p-6 sm:p-10 border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            >
                {/* header */}
                <div className="text-center mb-8">
                    <div className="text-2xl font-bold mb-3 logo-gradient">StudyHub</div>
                    <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--primary)' }}>Welcome Back</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Sign in to continue your learning journey</p>
                </div>

                {/* general error — aria-live so screen readers announce it */}
                <div aria-live="polite" aria-atomic="true">
                    {errors.general && (
                        <div className="mb-5 px-4 py-3 rounded-lg text-sm text-center"
                            style={{ color: 'var(--error)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                            {errors.general}
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} noValidate>

                    {/* email */}
                    <div className="mb-5">
                        <label htmlFor="email" className="block font-semibold text-sm mb-1.5">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onBlur={e => handleBlur('email', e.target.value)}
                            placeholder="you@university.cm"
                            autoComplete="email"
                            aria-describedby={errors.email ? 'email-error' : undefined}
                            aria-invalid={!!errors.email}
                            className="form-input px-4"
                            style={errors.email && touched.email ? { borderColor: 'var(--error)' } : {}}
                        />
                        <FieldError id="email-error" msg={touched.email ? errors.email : ''} />
                    </div>

                    {/* password + toggle */}
                    <div className="mb-5">
                        <label htmlFor="password" className="block font-semibold text-sm mb-1.5">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onBlur={e => handleBlur('password', e.target.value)}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                aria-describedby={errors.password ? 'password-error' : undefined}
                                aria-invalid={!!errors.password}
                                className="form-input px-4"
                                style={{
                                    paddingRight: '44px',
                                    ...(errors.password && touched.password ? { borderColor: 'var(--error)' } : {}),
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                                style={{ color: 'var(--text-muted)' }}
                                aria-label={showPw ? 'Hide password' : 'Show password'}
                                tabIndex={0}
                            >
                                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <FieldError id="password-error" msg={touched.password ? errors.password : ''} />
                    </div>

                    {/* remember me */}
                    <div className="flex items-center gap-2.5 mb-7">
                        <input
                            type="checkbox"
                            id="remember"
                            checked={remember}
                            onChange={e => setRemember(e.target.checked)}
                            className="w-4 h-4 shrink-0"
                        />
                        <label htmlFor="remember" className="text-sm select-none"
                            style={{ color: 'var(--text-secondary)' }}>
                            Remember me
                        </label>
                    </div>

                    {/* submit — single focal point */}
                    <button
                        type="submit"
                        disabled={loading || !isOnline}
                        className="w-full rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', height: '52px' }}
                        title={!isOnline ? "You're offline — reconnect to sign in" : "Sign in to your account"}
                    >
                        {!isOnline
                            ? <><WifiOff size={18} /> You’re Offline</>
                            : loading
                            ? <><Loader2 size={18} className="animate-spin" /> Signing in…</>
                            : 'Sign In →'
                        }
                    </button>
                </form>

                {/* secondary action — visually subordinate */}
                <div className="text-center mt-6 pt-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Don't have an account?{' '}
                        <Link to="/register" className="font-semibold" style={{ color: 'var(--primary)' }}>
                            Create one free
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
