import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, WifiOff, BookOpen, GraduationCap, Plus, X, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import HoneypotField, { HONEYPOT_FIELD } from '../components/ui/HoneypotField';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import { cn } from '../lib/cn';
import Seo from '../components/Seo';
import { trackEvent } from '../lib/analytics';

// Backend confirmed: university and fieldOfStudy are optional server-side.
// Only email, password, firstName, lastName are required by POST /api/auth/register.
// University and field of study will be collected during onboarding/profile completion instead.

const FIELDS_OF_STUDY = [
    'Computer Science', 'Engineering', 'Business', 'Medicine',
    'Arts & Humanities', 'Science', 'Mathematics', 'Physics',
    'Chemistry', 'Biology', 'Economics', 'Law', 'Other',
];

const SUGGESTED_SUBJECTS = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'French', 'History', 'Computer Science', 'Economics', 'Accounting',
    'Statistics', 'Literature', 'Philosophy', 'Geography', 'Calculus',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = ['Morning', 'Afternoon', 'Evening'];

function pwStrength(pw) {
    let s = 0;
    if (pw.length >= 8)           s++;
    if (pw.length >= 10)          s++;
    if (/[A-Z]/.test(pw))         s++;
    if (/[0-9]/.test(pw))         s++;
    if (/[^A-Za-z0-9]/.test(pw))  s++;
    return s;
}

function RoleCard({ icon: Icon, title, desc, selected, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex-1 flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all cursor-pointer',
                selected ? 'border-primary bg-primary-subtle' : 'border-border bg-bg',
            )}
        >
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', selected ? 'bg-primary' : 'bg-surface-hover')}>
                <Icon size={20} className={selected ? 'text-white' : 'text-fg-secondary'} />
            </div>
            <span className={cn('font-semibold text-sm', selected ? 'text-primary' : 'text-fg')}>{title}</span>
            <span className="text-xs text-fg-secondary">{desc}</span>
        </button>
    );
}

function TutorFields({ tutor, setTutor, errors, touched, setTouched, setErrors }) {
    const subjectInputRef = useRef();

    const addSubject = (s) => {
        const val = s.trim();
        if (!val || tutor.subjects.includes(val)) return;
        setTutor(t => ({ ...t, subjects: [...t.subjects, val], subjectInput: '' }));
        if (errors.subjects) setErrors(e => ({ ...e, subjects: '' }));
    };

    const removeSubject = (s) =>
        setTutor(t => ({ ...t, subjects: t.subjects.filter(x => x !== s) }));

    const toggleAvail = (day, time) => {
        setTutor(t => {
            const key = `${day}_${time}`;
            const avail = { ...t.availability };
            avail[key] = !avail[key];
            return { ...t, availability: avail };
        });
    };

    const subjectError = touched.subjects && errors.subjects;
    const bioError     = touched.tutorBio && errors.tutorBio;

    return (
        <div className="mt-2 mb-6 rounded-xl border border-primary bg-primary-subtle overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
                <p className="text-sm font-semibold text-primary">Tutor Application Details</p>
                <p className="text-xs mt-0.5 text-fg-secondary">Reviewed by our team before you appear in search</p>
            </div>

            <div className="p-5 space-y-5">

                {/* subjects */}
                <Field label="Subjects You Teach" required error={subjectError ? errors.subjects : ''}>
                    <div className="flex gap-2 mb-2">
                        <Input
                            ref={subjectInputRef}
                            type="text"
                            value={tutor.subjectInput}
                            onChange={e => setTutor(t => ({ ...t, subjectInput: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubject(tutor.subjectInput); } }}
                            placeholder="Type a subject and press Enter"
                            invalid={!!subjectError}
                            className="flex-1"
                        />
                        <button
                            type="button"
                            onClick={() => addSubject(tutor.subjectInput)}
                            className="px-3 rounded-sm flex items-center justify-center bg-primary-solid text-white shrink-0"
                            style={{ minWidth: '44px', minHeight: '44px' }}
                        ><Plus size={16} /></button>
                    </div>

                    {tutor.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {tutor.subjects.map(s => (
                                <span key={s} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-surface text-primary border border-primary/25">
                                    {s}
                                    <button type="button" onClick={() => removeSubject(s)} className="ml-0.5 hover:opacity-70"><X size={11} /></button>
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_SUBJECTS.filter(s => !tutor.subjects.includes(s)).slice(0, 8).map(s => (
                            <button key={s} type="button" onClick={() => addSubject(s)}
                                className="px-2.5 py-1 rounded-full text-xs border border-border text-fg-secondary transition-colors hover:border-primary">
                                + {s}
                            </button>
                        ))}
                    </div>
                </Field>

                {/* experience */}
                <Field label="Years of Experience" htmlFor="yearsExp" className="mb-0">
                    <Select
                        id="yearsExp"
                        value={tutor.yearsExperience}
                        onChange={e => setTutor(t => ({ ...t, yearsExperience: e.target.value }))}
                        className="w-[180px]"
                    >
                        <option value="<1">&lt;1 year</option>
                        <option value="1-2">1–2 years</option>
                        <option value="3-5">3–5 years</option>
                        <option value="5+">5+ years</option>
                    </Select>
                </Field>

                {/* bio */}
                <Field
                    label="Teaching Bio / Approach"
                    htmlFor="tutorBio"
                    required
                    error={bioError ? errors.tutorBio : ''}
                    className="mb-0"
                >
                    <Textarea
                        id="tutorBio"
                        value={tutor.bio}
                        onChange={e => {
                            if (e.target.value.length <= 300)
                                setTutor(t => ({ ...t, bio: e.target.value }));
                        }}
                        onBlur={() => {
                            setTouched(t => ({ ...t, tutorBio: true }));
                            setErrors(e => ({ ...e, tutorBio: tutor.bio.trim().length < 20 ? 'Bio must be at least 20 characters' : '' }));
                        }}
                        rows={3}
                        placeholder="e.g. I make complex topics simple by building intuition first..."
                        invalid={!!bioError}
                        aria-invalid={!!bioError}
                    />
                    <div className="flex justify-end mt-1">
                        <p className={cn('text-xs', tutor.bio.length >= 280 ? 'text-danger' : 'text-fg-muted')}>
                            {tutor.bio.length}/300
                        </p>
                    </div>
                </Field>

                {/* hourly rate */}
                <Field label="Hourly Rate (FCFA)" htmlFor="hourlyRate" hint="300–2000" className="mb-0">
                    <Input
                        id="hourlyRate"
                        type="number"
                        min={300}
                        max={2000}
                        value={tutor.hourlyRate}
                        onChange={e => setTutor(t => ({ ...t, hourlyRate: e.target.value }))}
                        className="w-[160px]"
                    />
                </Field>

                {/* availability */}
                <div>
                    <label className="block font-semibold text-sm mb-2 text-fg">Availability
                        <span className="ml-1.5 font-normal text-xs text-fg-muted">optional</span>
                    </label>
                    <div className="overflow-x-auto">
                        <table className="text-xs w-full" style={{ borderCollapse: 'separate', borderSpacing: '4px' }}>
                            <thead>
                                <tr>
                                    <th className="text-left pb-1 font-medium text-fg-secondary"></th>
                                    {TIMES.map(t => (
                                        <th key={t} className="pb-1 text-center font-medium text-fg-secondary">{t}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {DAYS.map(day => (
                                    <tr key={day}>
                                        <td className="pr-2 font-medium text-fg">{day}</td>
                                        {TIMES.map(time => {
                                            const key = `${day}_${time}`;
                                            const on  = !!tutor.availability[key];
                                            return (
                                                <td key={time} className="text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleAvail(day, time)}
                                                        className={cn(
                                                            'w-full rounded transition-colors border',
                                                            on ? 'bg-primary-solid border-primary text-white' : 'bg-bg border-border text-fg-muted',
                                                        )}
                                                        style={{ minHeight: '32px', minWidth: '72px' }}
                                                    >{on ? '✓' : '—'}</button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* proof document */}
                <Field label="Proof of Expertise" htmlFor="proofDoc" hint="optional — PDF or image, max 20MB" className="mb-0">
                    <input
                        id="proofDoc"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={e => setTutor(t => ({ ...t, proofFile: e.target.files[0] || null }))}
                        className="form-input px-4"
                        style={{ paddingTop: '8px', paddingBottom: '8px' }}
                    />
                </Field>

            </div>
        </div>
    );
}

export default function Register() {
    const { login } = useAuth();
    const navigate  = useNavigate();
    const isOnline  = useOnlineStatus();

    const [form, setForm] = useState({
        firstName: '', lastName: '', email: '',
        university: '', fieldOfStudy: '', password: '',
    });
    const [tutor, setTutor] = useState({
        subjects: [], subjectInput: '', bio: '',
        yearsExperience: '<1', hourlyRate: 500,
        availability: {}, proofFile: null,
    });
    const [role,    setRole]    = useState('student');
    const [terms,   setTerms]   = useState(false);
    const [showPw,  setShowPw]  = useState(false);
    const [errors,  setErrors]  = useState({});
    const [touched, setTouched] = useState({});
    const [loading, setLoading] = useState(false);

    const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

    /* ── per-field blur validation ──────────────────────────── */
    const validateField = (name, value) => {
        switch (name) {
            case 'firstName':  return value ? '' : 'First name is required';
            case 'lastName':   return value ? '' : 'Last name is required';
            case 'email':
                if (!value)                        return 'Email is required';
                if (!/\S+@\S+\.\S+/.test(value))   return 'Enter a valid email address';
                return '';
            case 'password':
                if (!value)          return 'Password is required';
                if (value.length < 8) return 'Password must be at least 8 characters';
                return '';
            default: return '';
        }
    };

    const handleBlur = (name, value) => {
        setTouched(t => ({ ...t, [name]: true }));
        const msg = validateField(name, value);
        setErrors(e => ({ ...e, [name]: msg }));
    };

    /* ── full submit validation ─────────────────────────────── */
    const validate = () => {
        const required = ['firstName', 'lastName', 'email', 'password'];
        const errs = {};
        required.forEach(f => {
            const msg = validateField(f, form[f]);
            if (msg) errs[f] = msg;
        });
        if (!terms) errs.terms = 'Please agree to the Terms of Service and Privacy Policy';
        if (role === 'tutor') {
            if (tutor.subjects.length === 0) errs.subjects = 'Add at least one subject';
            if (tutor.bio.trim().length < 20) errs.tutorBio = 'Bio must be at least 20 characters';
        }
        return errs;
    };

    const [confirmed, setConfirmed] = useState(false);
    const [honeypot, setHoneypot] = useState('');

    const handleSubmit = async e => {
        e.preventDefault();
        const errs = validate();
        setTouched(t => ({ ...t, firstName: true, lastName: true, email: true, password: true, tutorBio: role === 'tutor', subjects: role === 'tutor' }));
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setErrors({});
        setLoading(true);
        try {
            let data;
            if (role === 'tutor') {
                const fd = new FormData();
                fd.append('email',        form.email);
                fd.append('password',     form.password);
                fd.append('firstName',    form.firstName);
                fd.append('lastName',     form.lastName);
                if (form.university)   fd.append('university',   form.university);
                if (form.fieldOfStudy) fd.append('fieldOfStudy', form.fieldOfStudy);
                fd.append('becomeTutor', 'true');
                fd.append('tutorApplication', JSON.stringify({
                    subjects:        tutor.subjects,
                    bio:             tutor.bio,
                    yearsExperience: tutor.yearsExperience,
                    hourlyRate:      Number(tutor.hourlyRate) || 500,
                    availability:    tutor.availability,
                }));
                if (tutor.proofFile) fd.append('proofDocument', tutor.proofFile);
                fd.append(HONEYPOT_FIELD, honeypot);
                ({ data } = await api.post('/auth/register', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                }));
            } else {
                ({ data } = await api.post('/auth/register', {
                    email:        form.email,
                    password:     form.password,
                    firstName:    form.firstName,
                    lastName:     form.lastName,
                    university:   form.university   || undefined,
                    fieldOfStudy: form.fieldOfStudy || undefined,
                    [HONEYPOT_FIELD]: honeypot,
                }));
            }

            login(data.user, data.token);

            // The one conversion that matters on this page. No-ops when
            // analytics is unconfigured, so no guard is needed here.
            trackEvent('Signup', { role });

            if (role === 'tutor') {
                setConfirmed(true);
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setErrors({ general: err.response?.data?.error || 'Registration failed. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    /* ── password strength display ──────────────────────────── */
    const pw  = form.password;
    const sc  = pwStrength(pw);
    const barColorClass = !pw ? 'bg-border' : sc < 2 ? 'bg-danger' : sc < 4 ? 'bg-warning' : 'bg-success';
    const barTextClass  = !pw ? 'text-fg-muted' : sc < 2 ? 'text-danger' : sc < 4 ? 'text-warning' : 'text-success';
    const barWidth = !pw ? '0%' : sc < 2 ? '33%' : sc < 4 ? '66%' : '100%';
    const barLabel = !pw ? 'Use at least 8 characters'
        : sc < 2 ? 'Weak — add more characters'
        : sc < 4 ? 'Medium — add uppercase, numbers or symbols'
        : 'Strong password';

    if (confirmed) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12 bg-bg text-fg">
                <div className="w-full max-w-lg rounded-2xl p-8 sm:p-12 border border-border bg-surface shadow-lg text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-success-bg">
                        <CheckCircle2 size={36} className="text-success" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2 text-fg">Application Submitted!</h1>
                    <p className="mb-1 text-fg-secondary">
                        Thanks for applying to teach on StudyHub!
                    </p>
                    <p className="text-sm mb-8 text-fg-secondary">
                        We'll review your application and notify you within{' '}
                        <strong className="text-fg">24–48 hours</strong>.
                        In the meantime, explore StudyHub as a student.
                    </p>
                    <Button onClick={() => navigate('/dashboard')} size="lg" fullWidth>
                        Continue to Dashboard →
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12 bg-bg text-fg">
            <Seo title="Create Your Free Account" description="Create a free StudyHub account to join study groups, share and download course notes, ask questions and book verified tutors. No card required." path="/register" />
            <div className="form-card w-full max-w-lg rounded-2xl p-6 sm:p-10 border border-border bg-surface shadow-lg">
                {/* header */}
                <div className="text-center mb-8">
                    <div className="text-2xl font-bold mb-3 logo-gradient">StudyHub</div>
                    <h1 className="text-2xl font-bold mb-2 text-fg">Create Account</h1>
                    <p className="text-fg-secondary">Join StudyHub and start your learning journey</p>
                </div>

                {/* general server error */}
                <div aria-live="polite" aria-atomic="true">
                    {errors.general && (
                        <div className="mb-5 px-4 py-3 rounded-lg text-sm text-center bg-danger-bg text-danger border border-danger/25">
                            {errors.general}
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <HoneypotField value={honeypot} onChange={e => setHoneypot(e.target.value)} />

                    {/* role selection */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-7">
                        <RoleCard
                            icon={BookOpen}
                            title="I want to learn"
                            desc="Access tutors, notes & study groups"
                            selected={role === 'student'}
                            onClick={() => setRole('student')}
                        />
                        <RoleCard
                            icon={GraduationCap}
                            title="I want to teach"
                            desc="Become a tutor & earn by helping peers"
                            selected={role === 'tutor'}
                            onClick={() => setRole('tutor')}
                        />
                    </div>

                    {/* name row */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-5">
                        {[
                            ['firstName', 'First Name', 'First name'],
                            ['lastName',  'Last Name',  'Last name' ],
                        ].map(([field, label, ph]) => (
                            <Field key={field} label={label} htmlFor={field} error={touched[field] ? errors[field] : ''} className="flex-1 mb-0">
                                <Input
                                    id={field}
                                    type="text"
                                    value={form[field]}
                                    onChange={set(field)}
                                    onBlur={e => handleBlur(field, e.target.value)}
                                    placeholder={ph}
                                    autoComplete={field === 'firstName' ? 'given-name' : 'family-name'}
                                    aria-describedby={errors[field] ? `${field}-error` : undefined}
                                    invalid={!!(errors[field] && touched[field])}
                                />
                            </Field>
                        ))}
                    </div>

                    {/* email */}
                    <Field label="Email Address" htmlFor="email" error={touched.email ? errors.email : ''}>
                        <Input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={set('email')}
                            onBlur={e => handleBlur('email', e.target.value)}
                            placeholder="you@university.cm"
                            autoComplete="email"
                            aria-describedby={errors.email ? 'email-error' : undefined}
                            invalid={!!(errors.email && touched.email)}
                        />
                    </Field>

                    {/* password + strength meter + eye toggle */}
                    <Field label="Password" htmlFor="password" className="mb-5">
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPw ? 'text' : 'password'}
                                value={form.password}
                                onChange={set('password')}
                                onBlur={e => handleBlur('password', e.target.value)}
                                placeholder="Create a password"
                                autoComplete="new-password"
                                aria-describedby="pw-strength password-error"
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
                        {/* strength bar */}
                        <div className="h-1 rounded mt-2 overflow-hidden bg-border">
                            <div className={cn('h-full rounded transition-all duration-300', barColorClass)} style={{ width: barWidth }} />
                        </div>
                        <p id="pw-strength" className={cn('text-xs mt-1', barTextClass)}>{barLabel}</p>
                        {touched.password && errors.password && (
                            <p id="password-error" role="alert" className="text-xs mt-1.5 text-danger">{errors.password}</p>
                        )}
                    </Field>

                    {/* optional fields — clearly labelled as optional */}
                    <Field label="University / Institution" htmlFor="university" hint="optional">
                        <Input
                            id="university"
                            type="text"
                            value={form.university}
                            onChange={set('university')}
                            placeholder="Your university or institution"
                            autoComplete="organization"
                        />
                    </Field>

                    <Field label="Field of Study" htmlFor="fieldOfStudy" hint="optional" className="mb-6">
                        <Select
                            id="fieldOfStudy"
                            value={form.fieldOfStudy}
                            onChange={set('fieldOfStudy')}
                        >
                            <option value="">Select your field (optional)</option>
                            {FIELDS_OF_STUDY.map(f => <option key={f} value={f}>{f}</option>)}
                        </Select>
                    </Field>

                    {/* tutor fields — expand when role === 'tutor' */}
                    <div
                        style={{
                            maxHeight: role === 'tutor' ? '2000px' : '0',
                            overflow: 'hidden',
                            transition: 'max-height 0.4s ease',
                        }}
                    >
                        <TutorFields
                            tutor={tutor}
                            setTutor={setTutor}
                            errors={errors}
                            touched={touched}
                            setTouched={setTouched}
                            setErrors={setErrors}
                        />
                    </div>

                    {/* terms */}
                    <div className="flex items-start gap-3 mb-1.5">
                        <input
                            type="checkbox"
                            id="terms"
                            checked={terms}
                            onChange={e => setTerms(e.target.checked)}
                            className="mt-0.5 w-4 h-4 shrink-0"
                            aria-describedby={errors.terms ? 'terms-error' : undefined}
                        />
                        <label htmlFor="terms" className="text-sm select-none text-fg-secondary">
                            I agree to the{' '}
                            <Link to="/terms"   className="font-semibold text-primary">Terms of Service</Link>
                            {' '}and{' '}
                            <Link to="/privacy" className="font-semibold text-primary">Privacy Policy</Link>
                        </label>
                    </div>
                    <div aria-live="polite">
                        {errors.terms && <p id="terms-error" role="alert" className="text-xs mt-1.5 text-danger">{errors.terms}</p>}
                    </div>

                    {/* submit */}
                    <Button
                        type="submit"
                        size="lg"
                        fullWidth
                        loading={loading}
                        disabled={!isOnline}
                        icon={!isOnline ? WifiOff : undefined}
                        className="mt-5"
                        title={!isOnline ? "You're offline — reconnect to create account" : "Create your account"}
                    >
                        {!isOnline ? "You're Offline" : loading ? 'Creating Account…' : 'Create Account →'}
                    </Button>
                </form>

                {/* secondary action */}
                <div className="text-center mt-6 pt-6 border-t border-border">
                    <p className="text-sm text-fg-secondary">
                        Already have an account?{' '}
                        <Link to="/login" className="font-semibold text-primary">Sign in instead</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
