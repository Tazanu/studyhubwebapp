import { Users, MessageSquare, BookOpen, GraduationCap } from 'lucide-react';
import useInView from '../../hooks/useInView';

const BENEFITS = [
    {
        Icon: Users,
        headline: 'Find your people, stop studying alone',
        body: 'Create or join study groups in your department. Coordinate sessions, share resources, and stay accountable together.',
    },
    {
        Icon: MessageSquare,
        headline: 'Get unstuck in minutes, not days',
        body: "Post a question and get precise answers from peers who've already covered the material. The Q&A forum is fast and on-topic.",
    },
    {
        Icon: BookOpen,
        headline: 'Never miss a lecture again',
        body: 'Access well-organised notes, summaries, and past papers uploaded by fellow students. Free for the whole community.',
    },
    {
        Icon: GraduationCap,
        headline: 'Book a tutor who speaks your context',
        body: 'Connect with verified peer tutors for 1-on-1 sessions. Pay only for the time you use, starting from 500 FCFA/hr.',
    },
];

export default function WhySection() {
    const [ref, inView] = useInView();

    return (
        <section aria-labelledby="why-heading" className="py-20 sm:py-28 px-4 sm:px-6 bg-bg">
            <div className="max-w-6xl mx-auto">
                <header className={`text-center mb-14 fade-up ${inView ? 'in-view' : ''}`} ref={ref}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-primary">
                        Why StudyHub
                    </p>
                    <h2
                        id="why-heading"
                        className="font-bold text-fg"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', letterSpacing: '-0.02em' }}
                    >
                        Everything you need to excel, in one place
                    </h2>
                </header>

                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 list-none p-0 m-0">
                    {BENEFITS.map(({ Icon, headline, body }, i) => (
                        <li
                            key={headline}
                            className={`rounded-2xl border border-border bg-surface p-7 transition-transform hover:-translate-y-1 hover:shadow-lg fade-up delay-${i + 1} ${inView ? 'in-view' : ''}`}
                        >
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 bg-primary-subtle">
                                <Icon size={22} className="text-primary" strokeWidth={1.75} aria-hidden="true" />
                            </div>
                            <h3
                                className="font-semibold mb-2 leading-snug text-fg"
                                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1rem' }}
                            >
                                {headline}
                            </h3>
                            <p className="text-sm leading-relaxed text-fg-secondary">{body}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
