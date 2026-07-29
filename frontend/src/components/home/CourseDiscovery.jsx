import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Code2, FlaskConical, Calculator, BookOpen, Globe, Landmark, Cpu, TrendingUp } from 'lucide-react';
import api from '../../api/client';
import { normalizeTutorList } from '../../data/normalizeTutor';
import useInView from '../../hooks/useInView';

const SUBJECTS = [
    { Icon: Code2,        label: 'Computer Science', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'   },
    { Icon: Calculator,   label: 'Mathematics',      color: '#34d399', bg: 'rgba(52,211,153,0.1)'   },
    { Icon: FlaskConical, label: 'Chemistry',         color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
    { Icon: BookOpen,     label: 'Literature',        color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
    { Icon: Globe,        label: 'French / English',  color: '#38bdf8', bg: 'rgba(56,189,248,0.1)'  },
    { Icon: TrendingUp,   label: 'Economics',         color: '#fb923c', bg: 'rgba(251,146,60,0.1)'  },
    { Icon: Landmark,     label: 'Law',               color: '#facc15', bg: 'rgba(250,204,21,0.1)'  },
    { Icon: Cpu,          label: 'Engineering',       color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
];

const GRADIENTS = [
    'linear-gradient(135deg,#0052cc,#7c3aed)',
    'linear-gradient(135deg,#7c3aed,#db2777)',
    'linear-gradient(135deg,#059669,#0284c7)',
    'linear-gradient(135deg,#f97316,#eab308)',
    'linear-gradient(135deg,#dc2626,#7c3aed)',
    'linear-gradient(135deg,#0284c7,#34d399)',
];

export default function CourseDiscovery() {
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
        <section
            aria-labelledby="discover-heading"
            className="py-20 sm:py-28 px-4 sm:px-6 border-t"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
            <div className="max-w-6xl mx-auto">
                <header className={`text-center mb-12 fade-up ${inView ? 'in-view' : ''}`} ref={ref}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent-blue)' }}>
                        Browse by subject
                    </p>
                    <h2
                        id="discover-heading"
                        className="font-bold"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}
                    >
                        Find groups, notes & tutors by subject
                    </h2>
                </header>

                {/* subject grid */}
                <ul className="grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-14 list-none p-0 m-0">
                    {SUBJECTS.map(({ Icon, label, color, bg }, i) => (
                        <li key={label} className={`fade-up delay-${Math.min(i + 1, 6)} ${inView ? 'in-view' : ''}`}>
                            <Link
                                to="/register"
                                className="flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all hover:-translate-y-0.5 hover:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', outlineColor: '#0066ff' }}
                                aria-label={`Browse ${label} tutors and notes`}
                            >
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                                    <Icon size={18} color={color} aria-hidden="true" />
                                </div>
                                <span className="text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>

                {/* tutors row */}
                <div className={`fade-up delay-2 ${inView ? 'in-view' : ''}`}>
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-semibold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--text-primary)' }}>
                            Top-rated peer tutors
                        </h3>
                        <Link
                            to="/register"
                            className="text-sm font-semibold transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded"
                            style={{ color: 'var(--accent-blue)', outlineColor: '#0066ff' }}
                        >
                            View all tutors →
                        </Link>
                    </div>

                    {tutors.length === 0 ? (
                        <div
                            className="rounded-2xl border p-10 text-center"
                            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-main)' }}
                        >
                            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                                No approved tutors yet. Be the first to apply.
                            </p>
                            <Link
                                to="/register"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                                style={{ background: 'var(--accent-blue)' }}
                            >
                                Become a tutor
                            </Link>
                        </div>
                    ) : (
                        <div
                            className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:flex sm:gap-5 sm:overflow-x-auto sm:pb-4"
                            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
                            role="list"
                            aria-label="Top-rated tutors"
                        >
                            {tutors.map((tutor, i) => {
                                const subjects = tutor.subjects.slice(0, 2).map(s => s.name || s);
                                const rate = tutor.pricing?.single?.price;
                                return (
                                    <article
                                        key={tutor.id}
                                        role="listitem"
                                        className="rounded-2xl border overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-lg sm:flex-shrink-0"
                                        style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', scrollSnapAlign: 'start', minWidth: '200px' }}
                                    >
                                        <div className="h-24 w-full flex items-center justify-center relative" style={{ background: GRADIENTS[i % GRADIENTS.length] }} aria-hidden="true">
                                            {tutor.avatar
                                                ? <img src={tutor.avatar} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white/20" />
                                                : <span className="text-white text-3xl font-bold opacity-20" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{tutor.name.charAt(0)}</span>
                                            }
                                        </div>
                                        <div className="p-4">
                                            {subjects[0] && (
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: 'rgba(0,102,255,0.1)', color: 'var(--accent-blue)' }}>
                                                    {subjects[0]}
                                                </span>
                                            )}
                                            <h4 className="font-semibold mt-2 mb-0.5 text-sm" style={{ color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                                {tutor.name}
                                            </h4>
                                            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{tutor.title}</p>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-semibold" style={{ color: '#facc15' }} aria-label={`Rated ${tutor.rating} out of 5`}>
                                                    ★ {tutor.rating || 'New'} · {tutor.totalReviews} sessions
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold" style={{ color: '#34d399' }}>
                                                    {rate ? `${rate.toLocaleString()} FCFA/hr` : '500 FCFA/hr'}
                                                </span>
                                                <Link
                                                    to="/register"
                                                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                                    style={{ background: 'var(--accent-blue)', outlineColor: '#0066ff' }}
                                                    aria-label={`Book a session with ${tutor.name}`}
                                                >
                                                    Book
                                                </Link>
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
