import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { GraduationCap, DollarSign, Plus, X, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { apiError } from '../api/client';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Stepper from '../components/ui/Stepper';

const STEPS = ['About You', 'Subjects & Rate', 'Review & Submit'];

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
                toast.error('Please write a bio of at least 30 characters');
                return;
            }
        }
        if (step === 1) {
            if (form.subjects.length === 0) {
                toast.error('Add at least one subject');
                return;
            }
            if (!form.hourlyRate || isNaN(form.hourlyRate) || Number(form.hourlyRate) <= 0) {
                toast.error('Enter a valid hourly rate');
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
                bio: form.bio + (form.teachingPhilosophy ? `\n\nTeaching Philosophy: ${form.teachingPhilosophy}` : ''),
                subjects: form.subjects,
                hourlyRate: Number(form.hourlyRate),
                experienceYears: Number(form.experienceYears) || 0,
            });
            setSubmitted(true);
        } catch (err) {
            const msg = apiError(err, 'Failed to submit application');
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
                        Application Submitted!
                    </h1>
                    <p className="mb-2 text-fg-secondary">
                        Thanks, <strong>{user?.first_name}</strong>! Your tutor profile is pending review.
                    </p>
                    <p className="text-sm mb-8 text-fg-secondary">
                        We'll notify you within 24 to 48 hours once approved.
                    </p>
                    <Button to="/tutor-dashboard" size="lg">Back to Dashboard</Button>
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
                        Become a Tutor
                    </h1>
                    <p className="text-fg-secondary">
                        Share your knowledge and earn by helping fellow students.
                    </p>
                </div>

                {/* Step indicators */}
                <Stepper steps={STEPS} current={step + 1} className="mb-10 max-w-lg mx-auto" />

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
                        Back
                    </Button>

                    {step < STEPS.length - 1 ? (
                        <Button onClick={goNext} icon={ChevronRight} iconPosition="right" className="hover:scale-[1.02]">
                            Next
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading} loading={loading} icon={loading ? undefined : Check} className="hover:scale-[1.02]">
                            {loading ? 'Submitting…' : 'Submit Application'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Step 1: About ─────────────────────────────────────────────── */
function StepAbout({ form, set }) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>About You</h2>
                <p className="text-sm text-fg-secondary">Tell students who you are and why you're a great tutor.</p>
            </div>

            <Field label="Bio" hint="min. 30 chars">
                <Textarea
                    value={form.bio}
                    onChange={e => set('bio', e.target.value)}
                    rows={4}
                    placeholder="e.g. I'm a 3rd-year Mathematics student at University of Yaoundé with a passion for making complex topics simple..."
                />
                <p className={`text-xs mt-1 text-right ${form.bio.length < 30 ? 'text-danger' : 'text-success'}`}>
                    {form.bio.length} / 30 min
                </p>
            </Field>

            <Field label="Teaching Philosophy" hint="optional">
                <Textarea
                    value={form.teachingPhilosophy}
                    onChange={e => set('teachingPhilosophy', e.target.value)}
                    rows={3}
                    placeholder="e.g. I focus on building intuition before formulas..."
                />
            </Field>

            <Field label="Years of Experience" className="mb-0">
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
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Subjects & Rate</h2>
                <p className="text-sm text-fg-secondary">What do you teach, and how much do you charge per hour?</p>
            </div>

            {/* Subject input */}
            <div>
                <label className="block text-sm font-medium mb-2">Subjects</label>
                <div className="flex gap-2 mb-3">
                    <Input
                        type="text"
                        value={form.subjectInput}
                        onChange={e => set('subjectInput', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubject(form.subjectInput); } }}
                        placeholder="Type a subject and press Enter"
                        className="flex-1"
                    />
                    <Button onClick={() => addSubject(form.subjectInput)} icon={Plus} />
                </div>

                {/* Added subjects */}
                {form.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {form.subjects.map(s => (
                            <Badge key={s} tone="primary" size="md" className="gap-1.5">
                                {s}
                                <button onClick={() => removeSubject(s)} className="hover:opacity-70">
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Suggestions */}
                <div>
                    <p className="text-xs mb-2 text-fg-secondary">Quick add:</p>
                    <div className="flex flex-wrap gap-2">
                        {SUGGESTED_SUBJECTS.filter(s => !form.subjects.includes(s)).slice(0, 8).map(s => (
                            <button
                                key={s}
                                onClick={() => addSubject(s)}
                                className="px-3 py-1 rounded-lg text-xs border border-border text-fg-secondary transition-all hover:border-primary"
                            >
                                + {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hourly rate */}
            <Field label="Hourly Rate (FCFA)" hint="Typical range: 5,000 to 30,000 FCFA/hr" className="mb-0">
                <div className="relative w-48">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-secondary" />
                    <Input
                        type="number"
                        min="0"
                        value={form.hourlyRate}
                        onChange={e => set('hourlyRate', e.target.value)}
                        placeholder="e.g. 15000"
                        className="pl-9"
                    />
                </div>
            </Field>
        </div>
    );
}

/* ── Step 3: Review ────────────────────────────────────────────── */
function StepReview({ form, user }) {
    const rows = [
        { label: 'Name', value: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() },
        { label: 'Bio', value: form.bio },
        { label: 'Teaching Philosophy', value: form.teachingPhilosophy || 'N/A' },
        { label: 'Experience', value: form.experienceYears ? `${form.experienceYears} year(s)` : '0 years' },
        { label: 'Subjects', value: form.subjects.join(', ') || 'N/A' },
        { label: 'Hourly Rate', value: form.hourlyRate ? `${Number(form.hourlyRate).toLocaleString()} FCFA` : 'N/A' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Review & Submit</h2>
                <p className="text-sm text-fg-secondary">Double-check your details before submitting for approval.</p>
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
                    Your profile will be reviewed by our team within <strong>24 to 48 hours</strong>. You'll receive a notification once approved.
                </p>
            </div>
        </div>
    );
}
