import { Users, MessageSquare, BookOpen, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useInView from '../../hooks/useInView';

// Copy lives in the locale files; only the icon and its ordinal live here.
const BENEFITS = [
    { n: 1, Icon: Users },
    { n: 2, Icon: MessageSquare },
    { n: 3, Icon: BookOpen },
    { n: 4, Icon: GraduationCap },
];

export default function WhySection() {
    const { t } = useTranslation();
    const [ref, inView] = useInView();

    return (
        <section aria-labelledby="why-heading" className="py-20 sm:py-28 px-4 sm:px-6 bg-bg">
            <div className="max-w-6xl mx-auto">
                <header className={`text-center mb-14 fade-up ${inView ? 'in-view' : ''}`} ref={ref}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-primary">
                        {t('home.whyEyebrow')}
                    </p>
                    <h2
                        id="why-heading"
                        className="font-bold text-fg"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', letterSpacing: '-0.02em' }}
                    >
                        {t('home.whyTitle')}
                    </h2>
                </header>

                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 list-none p-0 m-0">
                    {BENEFITS.map(({ Icon, n }) => (
                        <li
                            key={n}
                            className={`rounded-2xl border border-border bg-surface p-7 transition-transform hover:-translate-y-1 hover:shadow-lg fade-up delay-${n} ${inView ? 'in-view' : ''}`}
                        >
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 bg-primary-subtle">
                                <Icon size={22} className="text-primary" strokeWidth={1.75} aria-hidden="true" />
                            </div>
                            <h3
                                className="font-semibold mb-2 leading-snug text-fg"
                                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1rem' }}
                            >
                                {t(`home.why${n}Title`)}
                            </h3>
                            <p className="text-sm leading-relaxed text-fg-secondary">{t(`home.why${n}Body`)}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
