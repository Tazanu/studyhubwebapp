import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Palette, Trash2, Eye, EyeOff, Sun, Moon, Shield, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { cn } from '../lib/cn';

const cardVariants = {
    hidden: { opacity: 0, y: 18 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

function Section({ icon: Icon, title, tone, children, delay = 0 }) {
    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="show"
            transition={{ delay }}
            className="rounded-2xl border border-border bg-surface overflow-hidden"
        >
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', TONE_BG[tone])}>
                    <Icon size={16} className={TONE_TEXT[tone]} strokeWidth={2} />
                </div>
                <h2 className="font-semibold text-sm text-fg">{title}</h2>
            </div>
            <div className="px-6 py-5">{children}</div>
        </motion.div>
    );
}

const TONE_BG = {
    primary: 'bg-primary-subtle',
    info: 'bg-info-bg',
    success: 'bg-success-bg',
    warning: 'bg-warning-bg',
    danger: 'bg-danger-bg',
};
const TONE_TEXT = {
    primary: 'text-primary',
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
};

// ── ACCOUNT SECTION ──────────────────────────────────────────────
function AccountSection({ user }) {
    return (
        <Section icon={User} title="Account" tone="primary" delay={0}>
            <Field label="Email address">
                <Input value={user?.email || ''} disabled />
            </Field>
            <Field label="Full name" className="mb-0">
                <Input value={`${user?.first_name || ''} ${user?.last_name || ''}`.trim()} disabled />
            </Field>
            <p className="text-xs mt-3 text-fg-muted">
                To update your name, university, or bio, visit your{' '}
                <a href="/profile" className="underline text-primary">Profile page</a>.
            </p>
        </Section>
    );
}

function PasswordField({ label, value, onChange, show, onToggleShow, placeholder }) {
    return (
        <Field label={label}>
            <div className="relative">
                <Input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="pr-11"
                />
                <button type="button" onClick={onToggleShow} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
        </Field>
    );
}

// ── PASSWORD SECTION ─────────────────────────────────────────────
function PasswordSection() {
    const [form, setForm]     = useState({ current: '', next: '', confirm: '' });
    const [show, setShow]     = useState({ current: false, next: false, confirm: false });
    const [loading, setLoading] = useState(false);

    const toggle = k => setShow(s => ({ ...s, [k]: !s[k] }));
    const set    = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const save = async () => {
        if (form.next !== form.confirm) { toast.error('New passwords do not match'); return; }
        if (form.next.length < 6)       { toast.error('Password must be at least 6 characters'); return; }
        setLoading(true);
        try {
            await api.post('/auth/change-password', { currentPassword: form.current, newPassword: form.next });
            toast.success('Password changed!');
            setForm({ current: '', next: '', confirm: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to change password');
        } finally { setLoading(false); }
    };

    return (
        <Section icon={Lock} title="Password & Security" tone="info" delay={0.07}>
            <PasswordField label="Current password" value={form.current} onChange={e => set('current', e.target.value)} show={show.current} onToggleShow={() => toggle('current')} placeholder="Enter current password" />
            <PasswordField label="New password" value={form.next} onChange={e => set('next', e.target.value)} show={show.next} onToggleShow={() => toggle('next')} placeholder="At least 6 characters" />
            <PasswordField label="Confirm new password" value={form.confirm} onChange={e => set('confirm', e.target.value)} show={show.confirm} onToggleShow={() => toggle('confirm')} placeholder="Repeat new password" />
            {form.next && form.confirm && form.next !== form.confirm && (
                <p className="text-xs mt-1 text-danger">Passwords don't match</p>
            )}
            <Button onClick={save} disabled={loading} loading={loading} size="sm" className="mt-2">
                {loading ? 'Saving…' : 'Change password'}
            </Button>
        </Section>
    );
}

// ── APPEARANCE SECTION ───────────────────────────────────────────
const THEME_PREVIEWS = [
    { key: 'light', icon: Sun,  label: 'Light', bg: '#f8fafc', border: '#e2e8f0' },
    { key: 'dark',  icon: Moon, label: 'Dark',  bg: '#0b0d10', border: '#262b33' },
];

function AppearanceSection() {
    const { theme, toggleTheme } = useTheme();

    return (
        <Section icon={Palette} title="Appearance" tone="success" delay={0.14}>
            <p className="text-sm mb-4 text-fg-secondary">
                Choose how StudyHub looks to you.
            </p>
            <div className="grid grid-cols-2 gap-3">
                {THEME_PREVIEWS.map(({ key, icon: Icon, label, bg, border }) => {
                    const active = theme === key;
                    return (
                        <motion.button
                            key={key}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => !active && toggleTheme()}
                            className={cn(
                                'relative rounded-xl border-2 p-4 text-left transition-all',
                                active ? 'border-primary bg-primary-subtle' : 'border-border bg-bg',
                            )}
                        >
                            {active && (
                                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                            )}
                            {/* mini preview */}
                            <div className="rounded-lg mb-3 p-2 flex flex-col gap-1.5" style={{ background: bg, border: `1px solid ${border}` }}>
                                <div className="h-1.5 w-3/4 rounded-full" style={{ background: border }} />
                                <div className="h-1.5 w-1/2 rounded-full" style={{ background: border }} />
                                <div className="h-4 w-full rounded" style={{ background: border, opacity: 0.5 }} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Icon size={14} className={active ? 'text-primary' : 'text-fg-secondary'} />
                                <span className={cn('text-sm font-semibold', active ? 'text-primary' : 'text-fg')}>
                                    {label}
                                </span>
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </Section>
    );
}

// ── NOTIFICATIONS SECTION ────────────────────────────────────────
function NotificationsSection() {
    const [prefs, setPrefs] = useState({
        answers:  true,
        mentions: true,
        groups:   true,
        notes:    false,
    });

    const toggle = k => setPrefs(p => ({ ...p, [k]: !p[k] }));

    const rows = [
        { key: 'answers',  label: 'New answers on my questions' },
        { key: 'mentions', label: 'Mentions & replies' },
        { key: 'groups',   label: 'Group activity' },
        { key: 'notes',    label: 'New notes in my subjects' },
    ];

    return (
        <Section icon={Bell} title="Notifications" tone="warning" delay={0.21}>
            <p className="text-sm mb-4 text-fg-secondary">
                Control which in-app notifications you receive.
            </p>
            <ul className="space-y-3">
                {rows.map(({ key, label }) => (
                    <li key={key} className="flex items-center justify-between">
                        <span className="text-sm text-fg">{label}</span>
                        <button
                            onClick={() => toggle(key)}
                            className={cn('relative w-10 h-5 rounded-full transition-colors', prefs[key] ? 'bg-primary' : 'bg-surface-hover')}
                        >
                            <motion.span
                                animate={{ x: prefs[key] ? 20 : 2 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow block"
                            />
                        </button>
                    </li>
                ))}
            </ul>
            <p className="text-xs mt-4 text-fg-muted">
                Preferences are saved locally. Email notifications coming soon.
            </p>
        </Section>
    );
}

// ── DANGER ZONE ──────────────────────────────────────────────────
function DangerSection({ onDeleteAccount }) {
    const [confirming, setConfirming] = useState(false);
    const [input, setInput]           = useState('');

    return (
        <Section icon={Shield} title="Danger Zone" tone="danger" delay={0.28}>
            <p className="text-sm mb-4 text-fg-secondary">
                Irreversible actions. Proceed with caution.
            </p>
            {!confirming ? (
                <Button onClick={() => setConfirming(true)} icon={Trash2} size="sm" className="!bg-danger-bg !text-danger">
                    Delete my account
                </Button>
            ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <p className="text-sm font-semibold text-danger">
                        Type <strong>DELETE</strong> to confirm account deletion.
                    </p>
                    <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type DELETE" />
                    <div className="flex gap-2">
                        <Button onClick={() => { setConfirming(false); setInput(''); }} variant="ghost" size="sm">
                            Cancel
                        </Button>
                        <Button disabled={input !== 'DELETE'} onClick={onDeleteAccount} variant="danger" size="sm">
                            Permanently delete
                        </Button>
                    </div>
                </motion.div>
            )}
        </Section>
    );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function Settings() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleDeleteAccount = async () => {
        try {
            await api.delete('/users/account');
            logout();
            navigate('/');
            toast.success('Account deleted.');
        } catch {
            toast.error('Could not delete account. Please contact support.');
        }
    };

    return (
        <div className="lg:pl-60 min-h-screen bg-bg">
            <Sidebar />
            <main className="pt-20 pb-16 px-4 md:px-8 max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="mb-8"
                >
                    <h1 className="text-2xl font-bold mb-1 text-fg" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                        Settings
                    </h1>
                    <p className="text-sm text-fg-secondary">
                        Manage your account, security, and preferences.
                    </p>
                </motion.div>

                <div className="flex flex-col gap-5">
                    <AccountSection user={user} />
                    <PasswordSection />
                    <AppearanceSection />
                    <NotificationsSection />
                    <DangerSection onDeleteAccount={handleDeleteAccount} />
                </div>
            </main>
        </div>
    );
}
