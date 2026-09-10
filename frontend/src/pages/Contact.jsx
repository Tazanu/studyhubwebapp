import { useState } from 'react';
import { Mail, Phone, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiError } from '../api/client';
import Seo from '../components/Seo';
import HomeFooter from '../components/home/HomeFooter';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import HoneypotField, { HONEYPOT_FIELD } from '../components/ui/HoneypotField';
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_HREF } from '../lib/contact';

const EMPTY = { name: '', email: '', subject: '', message: '' };

export default function Contact() {
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [honeypot, setHoneypot] = useState('');

    const validateField = (name, value) => {
        switch (name) {
            case 'name':    return value.trim() ? '' : 'Your name is required';
            case 'email':
                if (!value.trim()) return 'Email is required';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Enter a valid email address';
                return '';
            case 'message':
                if (!value.trim()) return 'A message is required';
                // Matches the server's rule, so the form never submits something
                // the API will reject.
                if (value.trim().length < 15) return 'Please give a little more detail';
                return '';
            default: return '';
        }
    };

    const set = (name, value) => {
        setForm(f => ({ ...f, [name]: value }));
        if (touched[name]) setErrors(e => ({ ...e, [name]: validateField(name, value) }));
    };

    const blur = (name) => {
        setTouched(t => ({ ...t, [name]: true }));
        setErrors(e => ({ ...e, [name]: validateField(name, form[name]) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const next = {};
        for (const f of ['name', 'email', 'message']) {
            const msg = validateField(f, form[f]);
            if (msg) next[f] = msg;
        }
        setTouched({ name: true, email: true, message: true });
        if (Object.keys(next).length) { setErrors(next); return; }

        setSending(true);
        try {
            const { data } = await api.post('/contact', { ...form, [HONEYPOT_FIELD]: honeypot });
            setSent(true);
            setForm(EMPTY);
            setTouched({});
            toast.success(data.message || 'Message sent');
        } catch (err) {
            toast.error(apiError(err, 'Could not send your message. Please try again.'));
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <Seo
                title="Contact Us"
                description="Get in touch with StudyHub — questions, problems with your account, tutor applications or anything else. We usually reply within a day or two."
                path="/contact"
            />

            <main className="min-h-screen pt-28 pb-20 px-6 bg-bg text-fg">
                <div className="max-w-4xl mx-auto">
                    <p className="text-sm font-semibold uppercase tracking-widest mb-3 text-primary">Contact</p>
                    <h1
                        className="font-bold mb-3"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', letterSpacing: '-0.02em' }}
                    >
                        Get in touch
                    </h1>
                    <p className="text-sm leading-relaxed mb-10 max-w-xl text-fg-secondary">
                        Questions, a problem with your account, a tutor application, or something that
                        is not working — send it here and we will get back to you.
                    </p>

                    <div className="grid lg:grid-cols-5 gap-8">
                        {/* direct details first: some people would rather not use a form */}
                        <aside className="lg:col-span-2 space-y-3">
                            <a
                                href={`mailto:${CONTACT_EMAIL}`}
                                className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface transition-colors hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary-subtle">
                                    <Mail size={17} className="text-primary" strokeWidth={1.75} />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-fg">Email</span>
                                    <span className="block text-xs mt-0.5 break-all text-fg-secondary">{CONTACT_EMAIL}</span>
                                </span>
                            </a>

                            <a
                                href={CONTACT_PHONE_HREF}
                                className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface transition-colors hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary-subtle">
                                    <Phone size={17} className="text-primary" strokeWidth={1.75} />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-fg">Phone / WhatsApp</span>
                                    <span className="block text-xs mt-0.5 text-fg-secondary">{CONTACT_PHONE}</span>
                                </span>
                            </a>

                            <p className="text-xs leading-relaxed px-1 text-fg-muted">
                                We usually reply within a day or two. For a problem with a payment,
                                include the receipt number so we can find the transaction.
                            </p>
                        </aside>

                        {/* form */}
                        <div className="lg:col-span-3">
                            {sent ? (
                                <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-success-bg">
                                        <CheckCircle2 size={26} className="text-success" />
                                    </div>
                                    <p className="font-bold text-lg mb-1">Message sent</p>
                                    <p className="text-sm mb-6 text-fg-secondary">
                                        Thanks for getting in touch. We usually reply within a day or two.
                                    </p>
                                    <Button variant="secondary" size="sm" icon={MessageSquare} onClick={() => setSent(false)}>
                                        Send another message
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
                                    <HoneypotField value={honeypot} onChange={e => setHoneypot(e.target.value)} />

                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <Field label="Your name" htmlFor="name" required error={touched.name ? errors.name : ''} className="flex-1">
                                            <Input
                                                id="name" value={form.name} autoComplete="name"
                                                onChange={e => set('name', e.target.value)}
                                                onBlur={() => blur('name')}
                                                invalid={!!(touched.name && errors.name)}
                                                placeholder="Amina Ngwa"
                                            />
                                        </Field>
                                        <Field label="Your email" htmlFor="email" required error={touched.email ? errors.email : ''} className="flex-1">
                                            <Input
                                                id="email" type="email" value={form.email} autoComplete="email"
                                                onChange={e => set('email', e.target.value)}
                                                onBlur={() => blur('email')}
                                                invalid={!!(touched.email && errors.email)}
                                                placeholder="you@university.cm"
                                            />
                                        </Field>
                                    </div>

                                    <Field label="Subject" htmlFor="subject">
                                        <Input
                                            id="subject" value={form.subject}
                                            onChange={e => set('subject', e.target.value)}
                                            placeholder="What is this about?"
                                        />
                                    </Field>

                                    <Field label="Message" htmlFor="message" required error={touched.message ? errors.message : ''}>
                                        <Textarea
                                            id="message" rows={6} value={form.message}
                                            onChange={e => set('message', e.target.value)}
                                            onBlur={() => blur('message')}
                                            invalid={!!(touched.message && errors.message)}
                                            placeholder="Tell us what you need help with…"
                                        />
                                    </Field>

                                    <Button type="submit" icon={Send} loading={sending} fullWidth>
                                        {sending ? 'Sending…' : 'Send message'}
                                    </Button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <HomeFooter />
        </>
    );
}
