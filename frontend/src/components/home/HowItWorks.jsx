import { UserPlus, Layers, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useInView from '../../hooks/useInView';

// Copy lives in the locale files; only the icon and its ordinal live here.
const STEPS = [
    { n: 1, step: '01', Icon: UserPlus },
    { n: 2, step: '02', Icon: Layers },
    { n: 3, step: '03', Icon: TrendingUp },
];

export default function HowItWorks() {
    const { t } = useTranslation();
    const [ref, inView] = useInView();

    return (
        <section aria-labelledby="how-heading" className="py-20 sm:py-28 px-4 sm:px-6 bg-bg">
            <div className="max-w-5xl mx-auto">
                <header className={`text-center mb-14 fade-up ${inView ? 'in-view' : ''}`} ref={ref}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-primary">
                        {t('home.howEyebrow')}
                    </p>
                    <h2
                        id="how-heading"
                        className="font-bold text-fg"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', letterSpacing: '-0.02em' }}
                    >
                        {t('home.howTitle')}
                    </h2>
                </header>

                <ol className="grid grid-cols-1 sm:grid-cols-3 gap-8 list-none p-0 m-0">
                    {STEPS.map(({ Icon, step, n }) => (
                        <li key={step} className={`relative flex flex-col items-center text-center fade-up delay-${n} ${inView ? 'in-view' : ''}`} style={{ zIndex: 1 }}>
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border-2 border-primary bg-primary-subtle transition-transform hover:scale-105">
                                <Icon size={26} className="text-primary" strokeWidth={1.75} aria-hidden="true" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest mb-2 text-fg-muted">
                                {t('home.step', { number: step })}
                            </span>
                            <h3 className="font-semibold mb-2 text-fg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.05rem' }}>
                                {t(`home.how${n}Title`)}
                            </h3>
                            <p className="text-sm leading-relaxed text-fg-secondary">{t(`home.how${n}Body`)}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
