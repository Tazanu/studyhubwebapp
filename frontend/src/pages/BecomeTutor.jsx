import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { GraduationCap, DollarSign, Plus, X, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api, { apiError } from '../api/client';
import { formatNumber } from '../lib/formatDate';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Stepper from '../components/ui/Stepper';

const STEP_KEYS = ['becomeTutor.step1', 'becomeTutor.step2', 'becomeTutor.step3'];

// Canonical English: these are stored as the tutor's subjects and searched
// against, so only the chip label is translated.
const SUGGESTED_SUBJECTS = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'French', 'History', 'Geography', 'Computer Science', 'Economics',
    'Calculus', 'Statistics', 'Literature', 'Philosophy', 'Accounting',
];

const slideVariants = {
    enter: dir => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
    exit: dir => ({ x: dir > 0 ? -60 : 60, opacity: 0, transition: { duration: 0.2 } }),
};

export default function BecomeTutor() {
    const { t } = useTranslation();
    const { user } = useAuth();

    const [step, setStep] = useState(0);
    const [dir, setDir] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [form, setForm] = useState({
        bio: '',
        teachingPhilosophy: '',
        experienceYears: '',
        hourlyRate: '',
        subjects: [],
        subjectInput: '',
    });

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const addSubject = (s) => {
        const trimmed = s.trim();
        if (!trimmed || form.subjects.includes(trimmed)) return;
        set('subjects', [...form.subjects, trimmed]);
        set('subjectInput', '');
    };

    const removeSubject = (s) => set('subjects', form.subjects.filter(x => x !== s));

    const goNext = () => {
        if (step === 0) {
            if (!form.bio.trim() || form.bio.length < 30) {
                toast.error(t('becomeTutor.bioTooShort'));
                return;
            }
        }
        if (step === 1) {
            if (form.subjects.length === 0) {
                toast.error(t('becomeTutor.addSubject'));
                return;
            }
            if (!form.hourlyRate || isNaN(form.hourlyRate) || Number(form.hourlyRate) <= 0) {
                toast.error(t('becomeTutor.invalidRate'));
                return;
            }
        }
        setDir(1);
        setStep(s => s + 1);
    };

    const goBack = () => {
        setDir(-1);
        setStep(s => s - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post('/tutors', {
                bio: form.bio + (form.teachingPhilosophy ? `\n\n${t('becomeTutor.philosophyPrefix')}: ${form.teachingPhilosophy}` : ''),
                subjects: form.subjects,
                hourlyRate: Number(form.hourlyRate),
                experienceYears: Number(form.experienceYears) || 0,
            });
            setSubmitted(true);
        } catch (err) {
            const msg = apiError(err, t('becomeTutor.submitFailed'));
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6 bg-bg text-fg">
                <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center max-w-md"
                >
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-success-bg">
                        <Check className="w-10 h-10 text-success" />
                    </div>
                    <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                        {t('becomeTutor.submittedTitle')}
                    </h1>
                    <p className="mb-2 text-fg-secondary">
                        <Trans
                            i18nKey="becomeTutor.submittedGreeting"
                            values={{ name: user?.first_name ?? '' }}
                            components={{ 1: <strong /> }}
                        />
                    </p>
                    <p className="text-sm mb-8 text-fg-secondary">
                        {t('becomeTutor.submittedBody')}
                    </p>
                    <Button to="/tutor-dashboard" size="lg">{t('becomeTutor.backToDashboard')}</Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-20 px-6 bg-bg text-fg">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-primary-subtle">
                        <GraduationCap className="w-7 h-7 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                        {t('becomeTutor.pageTitle')}
                    </h1>
                    <p className="text-fg-secondary">
                        {t('becomeTutor.pageSubtitle')}
                    </p>
                </div>

                {/* Step indicators */}
                <Stepper steps={STEP_KEYS.map(k => t(k))} current={step + 1} className="mb-10 max-w-lg mx-auto" />

                {/* Step card */}
                <div className="rounded-2xl border border-border bg-surface p-8 overflow-hidden relative">
                    <AnimatePresence mode="wait" custom={dir}>
                        <motion.div
                            key={step}
                            custom={dir}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                        >
                            {step === 0 && <StepAbout form={form} set={set} />}
                            {step === 1 && <StepSubjects form={form} set={set} addSubject={addSubject} removeSubject={removeSubject} />}
                            {step === 2 && <StepReview form={form} user={user} />}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-6">
                    <Button onClick={goBack} disabled={step === 0} variant="secondary" icon={ChevronLeft}>
                        {t('common.back')}
                    </Button>

                    {step < STEP_KEYS.length - 1 ? (
                        <Button onClick={goNext} icon={ChevronRight} iconPosition="right" className="hover:scale-[1.02]">
                            {t('becomeTutor.next')}
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading} loading={loading} icon={loading ? undefined : Check} className="hover:scale-[1.02]">
                            {loading ? t('becomeTutor.submitting') : t('becomeTutor.submit')}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Step 1: About ─────────────────────────────────────────────── */
function StepAbout({ form, set }) {
    const { t } = useTranslation();
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{t('becomeTutor.aboutTitle')}</h2>
                <p className="text-sm text-fg-secondary">{t('becomeTutor.aboutSubtitle')}</p>
            </div>

            <Field label={t('becomeTutor.bioLabel')} hint={t('becomeTutor.bioHint')}>
                <Textarea
                    value={form.bio}
                    onChange={e => set('bio', e.target.value)}
                    rows={4}
                    placeholder={t('becomeTutor.bioPlaceholder')}
                />
                <p className={`text-xs mt-1 text-right ${form.bio.length < 30 ? 'text-danger' : 'text-success'}`}>
                    {form.bio.length} / 30
                </p>
            </Field>

            <Field label={t('becomeTutor.philosophyLabel')} hint={t('common.optional').toLowerCase()}>
                <Textarea
                    value={form.teachingPhilosophy}
                    onChange={e => set('teachingPhilosophy', e.target.value)}
                    rows={3}
                    placeholder={t('becomeTutor.philosophyPlaceholder')}
                />
            </Field>

            <Field label={t('becomeTutor.yearsLabel')} className="mb-0">
                <Input
                    type="number"
                    min="0"
                    max="50"
                    value={form.experienceYears}
                    onChange={e => set('experienceYears', e.target.value)}
                    placeholder="0"
                    className="w-32"
                />
            </Field>
        </div>
    );
}

/* ── Step 2: Subjects & Rate ───────────────────────────────────── */
function StepSubjects({ form, set, addSubject, removeSubject }) {
    const { t } = useTranslation();
    const subjectLabel = s => t(`subjectName.${s}`, { defaultValue: s });
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{t('becomeTutor.subjectsTitle')}</h2>
                <p className="text-sm text-fg-secondary">{t('becomeTutor.subjectsSubtitle')}</p>
            </div>

            {/* Subject input */}
            <div>
                <label className="block text-sm font-medium mb-2">{t('becomeTutor.subjectsLabel')}</label>
                <div className="flex gap-2 mb-3">
                    <Input
                        type="text"
                        value={form.subjectInput}
                        onChange={e => set('subjectInput', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubject(form.subjectInput); } }}
                        placeholder={t('becomeTutor.subjectsPlaceholder')}
                        className="flex-1"
                    />
                    <Button onClick={() => addSubject(form.subjectInput)} icon={Plus} aria-label={t('register.addSubject')} />
                </div>

                {/* Added subjects */}
                {form.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {form.subjects.map(s => (
                            <Badge key={s} tone="primary" size="md" className="gap-1.5">
                                {subjectLabel(s)}
                                <button
                                    onClick={() => removeSubject(s)}
                                    aria-label={t('register.removeSubject', { subject: subjectLabel(s) })}
                                    className="hover:opacity-70"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Suggestions */}
                <div>
                    <p className="text-xs mb-2 text-fg-secondary">{t('becomeTutor.quickAdd')}</p>
                    <div className="flex flex-wrap gap-2">
                        {SUGGESTED_SUBJECTS.filter(s => !form.subjects.includes(s)).slice(0, 8).map(s => (
                            <button
                                key={s}
                                onClick={() => addSubject(s)}
                                className="px-3 py-1 rounded-lg text-xs border border-border text-fg-secondary transition-all hover:border-primary"
                            >
                                + {subjectLabel(s)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hourly rate */}
            <Field label={t('becomeTutor.rateLabel')} hint={t('becomeTutor.rateHint')} className="mb-0">
                <div className="relative w-48">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-secondary" />
                    <Input
                        type="number"
                        min="0"
                        value={form.hourlyRate}
                        onChange={e => set('hourlyRate', e.target.value)}
                        placeholder={t('becomeTutor.ratePlaceholder')}
                        className="pl-9"
                    />
                </div>
            </Field>
        </div>
    );
}

/* ── Step 3: Review ────────────────────────────────────────────── */
function StepReview({ form, user }) {
    const { t } = useTranslation();
    const na = t('becomeTutor.notProvided');
    const rows = [
        { label: t('becomeTutor.rowName'), value: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() },
        { label: t('becomeTutor.rowBio'), value: form.bio },
        { label: t('becomeTutor.rowPhilosophy'), value: form.teachingPhilosophy || na },
        { label: t('becomeTutor.rowExperience'), value: t('becomeTutor.yearsValue', { count: Number(form.experienceYears) || 0 }) },
        { label: t('becomeTutor.rowSubjects'), value: form.subjects.map(s => t(`subjectName.${s}`, { defaultValue: s })).join(', ') || na },
        { label: t('becomeTutor.rowRate'), value: form.hourlyRate ? `${formatNumber(form.hourlyRate)} FCFA` : na },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{t('becomeTutor.reviewTitle')}</h2>
                <p className="text-sm text-fg-secondary">{t('becomeTutor.reviewSubtitle')}</p>
            </div>

            <div className="rounded-xl border border-border divide-y divide-border">
                {rows.map(({ label, value }) => (
                    <div key={label} className="flex gap-4 px-5 py-3">
                        <span className="text-sm font-medium w-40 shrink-0 text-fg-secondary">{label}</span>
                        <span className="text-sm break-words text-fg">{value}</span>
                    </div>
                ))}
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl border border-success/20 bg-success-bg">
                <Check className="w-5 h-5 mt-0.5 shrink-0 text-success" />
                <p className="text-sm text-fg-secondary">
                    <Trans i18nKey="becomeTutor.reviewNotice" components={{ 1: <strong /> }} />
                </p>
            </div>
        </div>
    );
}
