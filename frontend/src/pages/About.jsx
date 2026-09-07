import { useRef } from 'react';
import { UserPlus, Layers, TrendingUp } from 'lucide-react';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import Testimonials from '../components/Testimonials';
import HomeFooter from '../components/home/HomeFooter';
import Seo from '../components/Seo';

/* ── shared variants ──────────────────────────────────────────── */
const fadeUp = (delay = 0) => ({
    hidden: { opacity: 0, y: 26 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay } },
});

const stagger = (s = 0.12, delay = 0) => ({
    hidden: {},
    show:   { transition: { staggerChildren: s, delayChildren: delay } },
});

const childFadeUp = {
    hidden: { opacity: 0, y: 24 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

/* ── hero variants ────────────────────────────────────────────── */
const heroContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.13, delayChildren: 0.05 } },
};
const heroItemNormal  = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } };
const heroItemReduced = { hidden: { opacity: 1, y: 0 },  show: { opacity: 1, y: 0 } };

/* ── steps data ───────────────────────────────────────────────── */
const steps = [
    { Icon: UserPlus,   step: '01', title: 'Create your account',        desc: "Sign up in under a minute. Set your university, field of study, and what you're looking for. Help or community." },
    { Icon: Layers,     step: '02', title: 'Join groups & find resources', desc: "Browse study groups in your department, download shared notes, ask questions, or book a tutor for a topic you're stuck on." },
    { Icon: TrendingUp, step: '03', title: 'Improve & succeed',            desc: 'Stay consistent with a community holding you accountable. Better grades, less stress, fewer all-nighters.' },
];

export default function About() {
    const reduced = useReducedMotion();
    const heroItem = reduced ? heroItemReduced : heroItemNormal;

    const missionRef  = useRef(null);
    const stepsRef    = useRef(null);
    const missionView = useInView(missionRef, { once: true, margin: '-80px' });
    const stepsView   = useInView(stepsRef,   { once: true, margin: '-80px' });

    return (
        <div className="bg-bg text-fg">
            <Seo title="About Us" description="Why StudyHub exists, how peer-to-peer learning works on the platform, and what students say about studying together here." path="/about" />

            {/* ── PAGE HERO ─────────────────────────────────────── */}
            <section className="pt-40 pb-24 px-6 text-center relative overflow-hidden">
                <div aria-hidden style={{ pointerEvents: 'none', position: 'absolute', inset: 0, zIndex: 0 }}>
                    <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />
                </div>

                <motion.div
                    style={{ position: 'relative', zIndex: 1 }}
                    variants={heroContainer}
                    initial="hidden"
                    animate="show"
                >
                    <motion.p
                        variants={heroItem}
                        className="text-sm font-semibold uppercase tracking-widest mb-4 text-primary"
                    >
                        Our story
                    </motion.p>

                    <motion.h1
                        variants={heroItem}
                        className="font-bold mb-6 gradient-text"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.5rem, 6vw, 4rem)', letterSpacing: '-0.03em', lineHeight: 1.1, display: 'block' }}
                    >
                        Built for students,<br />by students
                    </motion.h1>

                    <motion.p
                        variants={heroItem}
                        className="mx-auto text-lg text-fg-secondary"
                        style={{ maxWidth: 540, lineHeight: 1.75 }}
                    >
                        StudyHub was born out of a simple frustration: students had
                        no central place to connect, share knowledge, and support each other's academic growth.
                    </motion.p>
                </motion.div>
            </section>

            {/* ── MISSION ───────────────────────────────────────── */}
            <section ref={missionRef} className="py-24 px-6 border-t border-b border-border bg-surface">
                <motion.div
                    className="max-w-4xl mx-auto grid md:grid-cols-2 gap-16 items-center"
                    variants={reduced ? {} : stagger(0.15, 0)}
                    initial="hidden"
                    animate={missionView ? 'show' : 'hidden'}
                >
                    <motion.div variants={reduced ? {} : childFadeUp}>
                        <p className="text-sm font-semibold uppercase tracking-widest mb-3 text-primary">
                            Our mission
                        </p>
                        <h2 className="font-bold mb-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                            Remove every barrier between a student and their potential
                        </h2>
                        <p className="leading-relaxed text-fg-secondary" style={{ lineHeight: 1.8 }}>
                            We believe the biggest obstacles to academic success aren't intelligence.
                            They're access. Access to people who've already solved the problem you're
                            stuck on. Access to notes from a lecture you missed. Access to a tutor who
                            speaks your context.
                        </p>
                    </motion.div>

                    <motion.div variants={reduced ? {} : childFadeUp}>
                        <p className="leading-relaxed mb-5 text-fg-secondary" style={{ lineHeight: 1.8 }}>
                            StudyHub is our answer to that. A single platform where the knowledge
                            that already exists inside a university community stops being siloed in
                            private WhatsApp groups and hard drives. It becomes genuinely accessible.
                        </p>
                        <p className="leading-relaxed text-fg-secondary" style={{ lineHeight: 1.8 }}>
                            We started with a small community because that's where we live. We're building for
                            students who deal with infrastructure gaps, expensive data, and academic
                            systems that often move slower than the students inside them.
                        </p>
                    </motion.div>
                </motion.div>
            </section>

            {/* ── HOW IT WORKS ──────────────────────────────────── */}
            <section ref={stepsRef} className="py-32 px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        variants={reduced ? {} : fadeUp(0)}
                        initial="hidden"
                        animate={stepsView ? 'show' : 'hidden'}
                    >
                        <p className="text-sm font-semibold uppercase tracking-widest mb-3 text-primary">
                            How it works
                        </p>
                        <h2 className="font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)', letterSpacing: '-0.02em' }}>
                            Three steps to academic momentum
                        </h2>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                        variants={reduced ? {} : stagger(0.12, 0.1)}
                        initial="hidden"
                        animate={stepsView ? 'show' : 'hidden'}
                    >
                        {steps.map(({ Icon, step, title, desc }) => (
                            <motion.div
                                key={step}
                                variants={reduced ? {} : childFadeUp}
                                className="rounded-2xl p-8 border border-border bg-surface"
                            >
                                <div className="text-5xl font-bold mb-6 select-none text-border" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                                    {step}
                                </div>
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-primary-subtle">
                                    <Icon size={24} className="text-primary" strokeWidth={1.75} />
                                </div>
                                <h3 className="font-semibold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.05rem' }}>
                                    {title}
                                </h3>
                                <p className="text-sm leading-relaxed text-fg-secondary" style={{ lineHeight: 1.75 }}>
                                    {desc}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── TESTIMONIALS ──────────────────────────────────── */}
            <div className="border-t border-border">
                <Testimonials />
            </div>

            <HomeFooter />

        </div>
    );
}
