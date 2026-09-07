import { UserPlus, Layers, TrendingUp } from 'lucide-react';
import useInView from '../../hooks/useInView';

const STEPS = [
    {
        Icon: UserPlus,
        step: '01',
        title: 'Create your account',
        body: "Sign up in under a minute. Set your university, field of study, and what you're looking for. Help or community.",
    },
    {
        Icon: Layers,
        step: '02',
        title: 'Join groups & find resources',
        body: "Browse study groups in your department, download shared notes, ask questions, or book a tutor for a topic you're stuck on.",
    },
    {
        Icon: TrendingUp,
        step: '03',
        title: 'Improve & succeed',
        body: 'Stay consistent with a community holding you accountable. Better grades, less stress, fewer all-nighters.',
    },
];

export default function HowItWorks() {
    const [ref, inView] = useInView();

    return (
        <section aria-labelledby="how-heading" className="py-20 sm:py-28 px-4 sm:px-6 bg-bg">
            <div className="max-w-5xl mx-auto">
                <header className={`text-center mb-14 fade-up ${inView ? 'in-view' : ''}`} ref={ref}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-primary">
                        How it works
                    </p>
                    <h2
                        id="how-heading"
                        className="font-bold text-fg"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', letterSpacing: '-0.02em' }}
                    >
                        Three steps to academic momentum
                    </h2>
                </header>

                <ol className="grid grid-cols-1 sm:grid-cols-3 gap-8 list-none p-0 m-0">
                    {STEPS.map(({ Icon, step, title, body }, i) => (
                        <li key={step} className={`relative flex flex-col items-center text-center fade-up delay-${i + 1} ${inView ? 'in-view' : ''}`} style={{ zIndex: 1 }}>
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border-2 border-primary bg-primary-subtle transition-transform hover:scale-105">
                                <Icon size={26} className="text-primary" strokeWidth={1.75} aria-hidden="true" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest mb-2 text-fg-muted">
                                Step {step}
                            </span>
                            <h3 className="font-semibold mb-2 text-fg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.05rem' }}>
                                {title}
                            </h3>
                            <p className="text-sm leading-relaxed text-fg-secondary">{body}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
