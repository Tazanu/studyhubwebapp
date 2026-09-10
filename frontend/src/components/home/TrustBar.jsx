import { useTranslation } from 'react-i18next';
import useInView from '../../hooks/useInView';

const STATS = [
    { value: '5,000+', key: 'activeStudents' },
    { value: '4',      key: 'coreFeatures'   },
    { value: '500+',   key: 'peerTutors'     },
];

export default function TrustBar() {
    const { t } = useTranslation();
    const [ref, inView] = useInView();

    return (
        <section
            ref={ref}
            aria-label={t('home.statsLabel')}
            className="py-10 border-t border-b border-border bg-surface"
        >
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <dl className="grid grid-cols-3 gap-4 sm:gap-8">
                    {STATS.map(({ value, key }, i) => (
                        <div key={key} className={`text-center fade-up delay-${i + 1} ${inView ? 'in-view' : ''}`}>
                            <dt
                                className="text-3xl sm:text-4xl font-bold tabular-nums text-primary"
                                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                                {value}
                            </dt>
                            <dd className="mt-1 text-xs sm:text-sm font-medium uppercase tracking-wide text-fg-secondary">
                                {t(`home.${key}`)}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
}
