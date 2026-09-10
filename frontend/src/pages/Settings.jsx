import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Palette, Trash2, Eye, EyeOff, Sun, Moon, Shield, Bell, Languages } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import LanguageToggle from '../components/LanguageToggle';
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
    const { t } = useTranslation();
    return (
        <Section icon={User} title={t('settings.account')} tone="primary" delay={0}>
            <Field label={t('settings.emailAddress')}>
                <Input value={user?.email || ''} disabled />
            </Field>
            <Field label={t('settings.fullName')} className="mb-0">
                <Input value={`${user?.first_name || ''} ${user?.last_name || ''}`.trim()} disabled />
            </Field>
            <p className="text-xs mt-3 text-fg-muted">
                {t('settings.profileHintPre')}{' '}
                <a href="/profile" className="underline text-primary">{t('settings.profileHintLink')}</a>.
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
    const { t } = useTranslation();
    const [form, setForm]     = useState({ current: '', next: '', confirm: '' });
    const [show, setShow]     = useState({ current: false, next: false, confirm: false });
    const [loading, setLoading] = useState(false);

    const toggle = k => setShow(s => ({ ...s, [k]: !s[k] }));
    const set    = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const save = async () => {
        if (form.next !== form.confirm) { toast.error(t('settings.newPasswordsDontMatch')); return; }
        if (form.next.length < 6)       { toast.error(t('settings.passwordTooShort')); return; }
        setLoading(true);
        try {
            await api.post('/auth/change-password', { currentPassword: form.current, newPassword: form.next });
            toast.success(t('settings.passwordChanged'));
            setForm({ current: '', next: '', confirm: '' });
        } catch (err) {
            toast.error(apiError(err, t('settings.passwordChangeFailed')));
        } finally { setLoading(false); }
    };

    return (
        <Section icon={Lock} title={t('settings.passwordSection')} tone="info" delay={0.07}>
            <PasswordField label={t('settings.currentPassword')} value={form.current} onChange={e => set('current', e.target.value)} show={show.current} onToggleShow={() => toggle('current')} placeholder={t('settings.currentPasswordPlaceholder')} />
            <PasswordField label={t('settings.newPassword')} value={form.next} onChange={e => set('next', e.target.value)} show={show.next} onToggleShow={() => toggle('next')} placeholder={t('settings.newPasswordPlaceholder')} />
            <PasswordField label={t('settings.confirmPassword')} value={form.confirm} onChange={e => set('confirm', e.target.value)} show={show.confirm} onToggleShow={() => toggle('confirm')} placeholder={t('settings.confirmPasswordPlaceholder')} />
            {form.next && form.confirm && form.next !== form.confirm && (
                <p className="text-xs mt-1 text-danger">{t('settings.passwordsDontMatch')}</p>
            )}
            <Button onClick={save} disabled={loading} loading={loading} size="sm" className="mt-2">
                {loading ? t('settings.saving') : t('settings.changePassword')}
            </Button>
        </Section>
    );
}

// ── APPEARANCE SECTION ───────────────────────────────────────────
const THEME_PREVIEWS = [
    { key: 'light', icon: Sun,  labelKey: 'settings.themeLight', bg: '#f8fafc', border: '#e2e8f0' },
    { key: 'dark',  icon: Moon, labelKey: 'settings.themeDark',  bg: '#0b0d10', border: '#262b33' },
];

function AppearanceSection() {
    const { t } = useTranslation();
    const { theme, toggleTheme } = useTheme();

    return (
        <Section icon={Palette} title={t('settings.appearance')} tone="success" delay={0.14}>
            <p className="text-sm mb-4 text-fg-secondary">
                {t('settings.appearanceHint')}
            </p>
            <div className="grid grid-cols-2 gap-3">
                {THEME_PREVIEWS.map(({ key, icon: Icon, labelKey, bg, border }) => {
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
                                    {t(labelKey)}
                                </span>
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </Section>
    );
}

// ── LANGUAGE SECTION ─────────────────────────────────────────────
// The navbar toggle is easy to miss, and someone who has landed in the wrong
// language looks in Settings first — so the choice lives in both places.
function LanguageSection() {
    const { t } = useTranslation();

    return (
        <Section icon={Languages} title={t('settings.language')} tone="primary" delay={0.17}>
            <p className="text-sm mb-4 text-fg-secondary">
                {t('settings.languageHint')}
            </p>
            <LanguageToggle />
        </Section>
    );
}

// ── NOTIFICATIONS SECTION ────────────────────────────────────────
function NotificationsSection() {
    const { t } = useTranslation();
    const [prefs, setPrefs] = useState({
        answers:  true,
        mentions: true,
        groups:   true,
        notes:    false,
    });

    const toggle = k => setPrefs(p => ({ ...p, [k]: !p[k] }));

    const rows = [
        { key: 'answers',  label: t('settings.notifyAnswers')  },
        { key: 'mentions', label: t('settings.notifyMentions') },
        { key: 'groups',   label: t('settings.notifyGroups')   },
        { key: 'notes',    label: t('settings.notifyNotes')    },
    ];

    return (
        <Section icon={Bell} title={t('settings.notifications')} tone="warning" delay={0.21}>
            <p className="text-sm mb-4 text-fg-secondary">
                {t('settings.notificationsHint')}
            </p>
            <ul className="space-y-3">
                {rows.map(({ key, label }) => (
                    <li key={key} className="flex items-center justify-between">
                        <span className="text-sm text-fg">{label}</span>
                        <button
                            onClick={() => toggle(key)}
                            role="switch"
                            aria-checked={prefs[key]}
                            aria-label={label}
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
                {t('settings.notificationsFooter')}
            </p>
        </Section>
    );
}

// ── DANGER ZONE ──────────────────────────────────────────────────
function DangerSection({ onDeleteAccount }) {
    const { t } = useTranslation();
    const [confirming, setConfirming] = useState(false);
    const [input, setInput]           = useState('');

    // The word to type is translated, so the comparison has to use the same
    // translated value — checking against a literal 'DELETE' would leave the
    // button permanently disabled for anyone reading the French prompt.
    const deleteWord = t('settings.deleteWord');

    return (
        <Section icon={Shield} title={t('settings.dangerZone')} tone="danger" delay={0.28}>
            <p className="text-sm mb-4 text-fg-secondary">
                {t('settings.dangerHint')}
            </p>
            {!confirming ? (
                <Button onClick={() => setConfirming(true)} icon={Trash2} size="sm" className="!bg-danger-bg !text-danger">
                    {t('settings.deleteAccount')}
                </Button>
            ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <p className="text-sm font-semibold text-danger">
                        {t('settings.deleteConfirmPre')} <strong>{deleteWord}</strong> {t('settings.deleteConfirmPost')}
                    </p>
                    <Input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={t('settings.deletePlaceholder', { word: deleteWord })}
                        aria-label={t('settings.deletePlaceholder', { word: deleteWord })}
                    />
                    <div className="flex gap-2">
                        <Button onClick={() => { setConfirming(false); setInput(''); }} variant="ghost" size="sm">
                            {t('common.cancel')}
                        </Button>
                        <Button disabled={input.trim() !== deleteWord} onClick={onDeleteAccount} variant="danger" size="sm">
                            {t('settings.permanentlyDelete')}
                        </Button>
                    </div>
                </motion.div>
            )}
        </Section>
    );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function Settings() {
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleDeleteAccount = async () => {
        try {
            await api.delete('/users/account');
            logout();
            navigate('/');
            toast.success(t('settings.accountDeleted'));
        } catch {
            toast.error(t('settings.deleteFailed'));
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
                        {t('settings.title')}
                    </h1>
                    <p className="text-sm text-fg-secondary">
                        {t('settings.subtitle')}
                    </p>
                </motion.div>

                <div className="flex flex-col gap-5">
                    <AccountSection user={user} />
                    <PasswordSection />
                    <AppearanceSection />
                    <LanguageSection />
                    <NotificationsSection />
                    <DangerSection onDeleteAccount={handleDeleteAccount} />
                </div>
            </main>
        </div>
    );
}
