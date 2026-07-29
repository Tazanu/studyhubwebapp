import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { GraduationCap, BookOpen, DollarSign, Plus, X, Check, ChevronRight, ChevronLeft, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

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
    const navigate = useNavigate();

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
            const msg = err.response?.data?.error || 'Failed to submit application';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6"
                style={{ background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
                <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center max-w-md"
                >
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                        style={{ background: 'rgba(52,211,153,0.15)' }}>
                        <Check className="w-10 h-10" style={{ color: '#34d399' }} />
                    </div>
                    <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                        Application Submitted!
                    </h1>
                    <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>
                        Thanks, <strong>{user?.first_name}</strong>! Your tutor profile is pending review.
                    </p>
                    <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
                        We'll notify you within 24 to 48 hours once approved.
                    </p>
                    <button
                        onClick={() => navigate('/tutor-dashboard')}
                        className="px-8 py-3 rounded-xl font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg,#0052cc,#0066ff)' }}
                    >
                        Back to Dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-20 px-6"
            style={{ background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                        style={{ background: 'rgba(0,102,255,0.1)' }}>
                        <GraduationCap className="w-7 h-7" style={{ color: 'var(--accent-blue)' }} />
                    </div>
                    <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                        Become a Tutor
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Share your knowledge and earn by helping fellow students.
                    </p>
                </div>

                {/* Step indicators */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    {STEPS.map((label, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                                    style={{
                                        background: i <= step ? 'var(--accent-blue)' : 'var(--bg-card)',
                                        color: i <= step ? 'white' : 'var(--text-secondary)',
                                        border: `2px solid ${i <= step ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                                    }}
                                >
                                    {i < step ? <Check className="w-4 h-4" /> : i + 1}
                                </div>
                                <span className="text-sm font-medium hidden sm:block"
                                    style={{ color: i === step ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                    {label}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className="w-8 h-px mx-1" style={{ background: 'var(--border-subtle)' }} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step card */}
                <div className="rounded-2xl border p-8 overflow-hidden relative"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
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
                    <button
                        onClick={goBack}
                        disabled={step === 0}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold border transition-all disabled:opacity-30"
                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    >
                        <ChevronLeft className="w-4 h-4" /> Back
                    </button>

                    {step < STEPS.length - 1 ? (
                        <button
                            onClick={goNext}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]"
                            style={{ background: 'linear-gradient(135deg,#0052cc,#0066ff)' }}
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg,#0052cc,#0066ff)' }}
                        >
                            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {loading ? 'Submitting…' : 'Submit Application'}
                        </button>
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
                <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>About You</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tell students who you are and why you're a great tutor.</p>
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">Bio <span style={{ color: 'var(--text-secondary)' }}>(min. 30 chars)</span></label>
                <textarea
                    value={form.bio}
                    onChange={e => set('bio', e.target.value)}
                    rows={4}
                    placeholder="e.g. I'm a 3rd-year Mathematics student at University of Yaoundé with a passion for making complex topics simple..."
                    className="w-full p-4 rounded-xl border resize-none text-sm"
                    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                />
                <p className="text-xs mt-1 text-right" style={{ color: form.bio.length < 30 ? '#f87171' : '#34d399' }}>
                    {form.bio.length} / 30 min
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">Teaching Philosophy <span style={{ color: 'var(--text-secondary)' }}>(optional)</span></label>
                <textarea
                    value={form.teachingPhilosophy}
                    onChange={e => set('teachingPhilosophy', e.target.value)}
                    rows={3}
                    placeholder="e.g. I focus on building intuition before formulas..."
                    className="w-full p-4 rounded-xl border resize-none text-sm"
                    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">Years of Experience</label>
                <input
                    type="number"
                    min="0"
                    max="50"
                    value={form.experienceYears}
                    onChange={e => set('experienceYears', e.target.value)}
                    placeholder="0"
                    className="w-32 p-3 rounded-xl border text-sm"
                    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                />
            </div>
        </div>
    );
}

/* ── Step 2: Subjects & Rate ───────────────────────────────────── */
function StepSubjects({ form, set, addSubject, removeSubject }) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Subjects & Rate</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>What do you teach, and how much do you charge per hour?</p>
            </div>

            {/* Subject input */}
            <div>
                <label className="block text-sm font-medium mb-2">Subjects</label>
                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={form.subjectInput}
                        onChange={e => set('subjectInput', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubject(form.subjectInput); } }}
                        placeholder="Type a subject and press Enter"
                        className="flex-1 p-3 rounded-xl border text-sm"
                        style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                    <button
                        onClick={() => addSubject(form.subjectInput)}
                        className="px-4 py-2 rounded-xl font-semibold text-white"
                        style={{ background: 'var(--accent-blue)' }}
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* Added subjects */}
                {form.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {form.subjects.map(s => (
                            <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                                style={{ background: 'rgba(0,102,255,0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(0,102,255,0.2)' }}>
                                {s}
                                <button onClick={() => removeSubject(s)} className="hover:opacity-70">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Suggestions */}
                <div>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Quick add:</p>
                    <div className="flex flex-wrap gap-2">
                        {SUGGESTED_SUBJECTS.filter(s => !form.subjects.includes(s)).slice(0, 8).map(s => (
                            <button
                                key={s}
                                onClick={() => addSubject(s)}
                                className="px-3 py-1 rounded-lg text-xs border transition-all hover:border-blue-500"
                                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                            >
                                + {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hourly rate */}
            <div>
                <label className="block text-sm font-medium mb-2">Hourly Rate (FCFA)</label>
                <div className="relative w-48">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    <input
                        type="number"
                        min="0"
                        value={form.hourlyRate}
                        onChange={e => set('hourlyRate', e.target.value)}
                        placeholder="e.g. 15000"
                        className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm"
                        style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Typical range: 5,000 to 30,000 FCFA/hr
                </p>
            </div>
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
                <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Review & Submit</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Double-check your details before submitting for approval.</p>
            </div>

            <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {rows.map(({ label, value }) => (
                    <div key={label} className="flex gap-4 px-5 py-3">
                        <span className="text-sm font-medium w-40 shrink-0" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                        <span className="text-sm break-words" style={{ color: 'var(--text-primary)' }}>{value}</span>
                    </div>
                ))}
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <Check className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#34d399' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Your profile will be reviewed by our team within <strong>24 to 48 hours</strong>. You'll receive a notification once approved.
                </p>
            </div>
        </div>
    );
}
