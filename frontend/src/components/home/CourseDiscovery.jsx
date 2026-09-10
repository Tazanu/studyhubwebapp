import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Code2, FlaskConical, Calculator, BookOpen, Globe, Landmark, Cpu, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import { normalizeTutorList } from '../../data/normalizeTutor';
import useInView from '../../hooks/useInView';
import Button from '../ui/Button';

const SUBJECTS = [
    { Icon: Code2,        key: 'Computer Science' },
    { Icon: Calculator,   key: 'Mathematics'      },
    { Icon: FlaskConical, key: 'Chemistry'        },
    { Icon: BookOpen,     key: 'Literature'       },
    { Icon: Globe,        key: 'French / English' },
    { Icon: TrendingUp,   key: 'Economics'        },
    { Icon: Landmark,     key: 'Law'              },
    { Icon: Cpu,          key: 'Engineering'      },
];

export default function CourseDiscovery() {
    const { t } = useTranslation();
    const [tutors, setTutors] = useState([]);
    const [ref, inView] = useInView();

    const fetchTutors = () => {
        api.get('/tutors')
            .then(r => { if (r.data?.length) setTutors(r.data.map(normalizeTutorList).slice(0, 6)); })
            .catch(() => {});
    };

    useEffect(() => {
        fetchTutors();
        const onVisible = () => { if (document.visibilityState === 'visible') fetchTutors(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);

    return (
        <section aria-labelledby="discover-heading" className="py-20 sm:py-28 px-4 sm:px-6 border-t border-border bg-surface">
            <div className="max-w-6xl mx-auto">
                <header className={`text-center mb-12 fade-up ${inView ? 'in-view' : ''}`} ref={ref}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-primary">
                        {t('home.discoverEyebrow')}
                    </p>
                    <h2
                        id="discover-heading"
                        className="font-bold text-fg"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', letterSpacing: '-0.02em' }}
                    >
                        {t('home.discoverTitle')}
                    </h2>
                </header>

                {/* subject grid */}
                <ul className="grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-14 list-none p-0 m-0">
                    {SUBJECTS.map(({ Icon, key }, i) => {
                        const label = t(`subjectName.${key}`, { defaultValue: key });
                        return (
                        <li key={key} className={`fade-up delay-${Math.min(i + 1, 6)} ${inView ? 'in-view' : ''}`}>
                            <Link
                                to="/register"
                                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-bg text-center transition-all hover:-translate-y-0.5 hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                aria-label={t('home.browseSubject', { subject: label })}
                            >
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary-subtle">
                                    <Icon size={18} className="text-primary" aria-hidden="true" />
                                </div>
                                <span className="text-xs font-medium leading-tight text-fg-secondary">{label}</span>
                            </Link>
                        </li>
                        );
                    })}
                </ul>

                {/* tutors row */}
                <div className={`fade-up delay-2 ${inView ? 'in-view' : ''}`}>
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-semibold text-lg text-fg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {t('home.topTutors')}
                        </h3>
                        <Link
                            to="/register"
                            className="text-sm font-semibold text-primary transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
                        >
                            {t('home.viewAllTutors')} →
                        </Link>
                    </div>

                    {tutors.length === 0 ? (
                        <div className="rounded-2xl border border-border bg-bg p-10 text-center">
                            <p className="text-sm mb-3 text-fg-secondary">
                                {t('home.noTutorsYet')}
                            </p>
                            <Button to="/register" size="md">{t('home.becomeTutor')}</Button>
                        </div>
                    ) : (
                        <div
                            className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:flex sm:gap-5 sm:overflow-x-auto sm:pb-4"
                            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
                            role="list"
                            aria-label={t('home.topTutorsLabel')}
                        >
                            {tutors.map((tutor) => {
                                const subjects = tutor.subjects.slice(0, 2).map(s => s.name || s);
                                const rate = tutor.pricing?.single?.price;
                                return (
                                    <article
                                        key={tutor.id}
                                        role="listitem"
                                        className="rounded-2xl border border-border bg-bg overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-lg sm:flex-shrink-0"
                                        style={{ scrollSnapAlign: 'start', minWidth: '200px' }}
                                    >
                                        <div className="h-24 w-full flex items-center justify-center relative" style={{ background: 'var(--gradient-primary)' }} aria-hidden="true">
                                            {tutor.avatar
                                                ? <img src={tutor.avatar} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white/20" />
                                                : <span className="text-white text-3xl font-bold opacity-20" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{tutor.name.charAt(0)}</span>
                                            }
                                        </div>
                                        <div className="p-4">
                                            {subjects[0] && (
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary-subtle text-primary">
                                                    {subjects[0]}
                                                </span>
                                            )}
                                            <h4 className="font-semibold mt-2 mb-0.5 text-sm text-fg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                                {tutor.name}
                                            </h4>
                                            <p className="text-xs mb-2 text-fg-muted">{tutor.title}</p>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-semibold text-warning" aria-label={t('home.ratedOutOf5', { rating: tutor.rating })}>
                                                    ★ {tutor.rating || t('home.ratingNew')} · {t('home.sessionsCount', { count: tutor.totalReviews })}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-success">
                                                    {t('home.perHour', { rate: (rate || 500).toLocaleString() })}
                                                </span>
                                                <Button to="/register" size="sm" aria-label={t('home.bookWith', { name: tutor.name })}>
                                                    {t('home.book')}
                                                </Button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
