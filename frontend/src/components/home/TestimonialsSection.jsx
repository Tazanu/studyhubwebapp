import { useTranslation } from 'react-i18next';
import useInView from '../../hooks/useInView';
import { TESTIMONIALS as ALL_TESTIMONIALS } from '../../data/testimonials';

const FEATURED_IDS = ['aicha', 'fabrice', 'rodrigue'];
const TESTIMONIALS = FEATURED_IDS.map(id => ALL_TESTIMONIALS.find(x => x.id === id));

export default function TestimonialsSection() {
    const { t } = useTranslation();
    const [ref, inView] = useInView();

    return (
        <section aria-labelledby="testimonials-heading" className="py-20 sm:py-28 px-4 sm:px-6 border-t border-border bg-surface">
            <div className="max-w-6xl mx-auto">
                <header className={`text-center mb-14 fade-up ${inView ? 'in-view' : ''}`} ref={ref}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-primary">
                        {t('home.testimonialsEyebrow')}
                    </p>
                    <h2
                        id="testimonials-heading"
                        className="font-bold text-fg"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', letterSpacing: '-0.02em' }}
                    >
                        {t('home.testimonialsTitle')}
                    </h2>
                </header>

                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-6 list-none p-0 m-0">
                    {TESTIMONIALS.map(({ quote, name, role, initials }, i) => (
                        <li
                            key={name}
                            className={`rounded-2xl border border-border bg-bg p-7 flex flex-col transition-transform hover:-translate-y-1 hover:shadow-lg fade-up delay-${i + 1} ${inView ? 'in-view' : ''}`}
                        >
                            <div className="flex gap-0.5 mb-4 text-warning" aria-label={t('home.fiveStars')}>
                                {Array.from({ length: 5 }).map((_, star) => (
                                    <span key={star} aria-hidden="true">★</span>
                                ))}
                            </div>

                            <blockquote className="flex-1 mb-6">
                                <p className="text-sm leading-relaxed text-fg-secondary">
                                    "{quote}"
                                </p>
                            </blockquote>

                            <footer className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-primary-subtle text-primary"
                                    aria-hidden="true"
                                >
                                    {initials}
                                </div>
                                <div>
                                    <cite className="not-italic font-semibold text-sm block text-fg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                        {name}
                                    </cite>
                                    <span className="text-xs text-fg-muted">{role}</span>
                                </div>
                            </footer>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
