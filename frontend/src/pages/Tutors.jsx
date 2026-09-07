import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Search, BookOpen, Award, TrendingUp, X, SearchX } from 'lucide-react';
import { mockTutor } from '../data/mockTutor';
import { normalizeTutorList } from '../data/normalizeTutor';
import Sidebar from '../components/Sidebar';
import TutorAvatar from '../components/tutor/TutorAvatar';
import api from '../api/client';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import StarRating from '../components/ui/StarRating';

const FALLBACK_TUTORS = [
    normalizeTutorList({ ...mockTutor, users: { first_name: 'Dr. Sarah', last_name: 'Ndongo', profile_picture: mockTutor.avatar }, hourly_rate: mockTutor.pricing.single.price, total_sessions: mockTutor.totalReviews })
];

const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

export default function Tutors() {
    const [allTutors, setAllTutors] = useState(FALLBACK_TUTORS);
    const [search, setSearch] = useState('');
    const [subject, setSubject] = useState('');
    const [sortBy, setSortBy] = useState('rating');

    useEffect(() => {
        api.get('/tutors')
            .then(r => {
                if (r.data?.length) {
                    const normalized = r.data.map(normalizeTutorList);
                    // Cache so profile page can read the exact same avatar/name
                    sessionStorage.setItem('tutors_cache', JSON.stringify(normalized));
                    setAllTutors(normalized);
                }
            })
            .catch(() => {}); // keep fallback on error
    }, []);

    const SUBJECTS = [...new Set(allTutors.flatMap(t =>
        Array.isArray(t.subjects) ? t.subjects.map(s => s.name || s) : []
    ))].sort();

    const filtered = useMemo(() => {
        let list = [...allTutors];
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(t =>
                t.name.toLowerCase().includes(q) ||
                t.title?.toLowerCase().includes(q) ||
                (Array.isArray(t.subjects) ? t.subjects.some(s => (s.name || s).toLowerCase().includes(q)) : false)
            );
        }
        if (subject) {
            list = list.filter(t =>
                Array.isArray(t.subjects)
                    ? t.subjects.some(s => (s.name || s) === subject)
                    : false
            );
        }
        list.sort((a, b) => {
            if (sortBy === 'rating') return b.rating - a.rating;
            if (sortBy === 'price_low') return (a.pricing?.single?.price || 0) - (b.pricing?.single?.price || 0);
            if (sortBy === 'price_high') return (b.pricing?.single?.price || 0) - (a.pricing?.single?.price || 0);
            if (sortBy === 'reviews') return (b.totalReviews || 0) - (a.totalReviews || 0);
            return 0;
        });
        return list;
    }, [search, subject, sortBy, allTutors]);

    const totalStudents = allTutors.reduce((s, t) => s + (t.stats?.totalStudents || 0), 0);
    const avgRating = (allTutors.reduce((s, t) => s + t.rating, 0) / allTutors.length).toFixed(1);

    return (
        <div className="lg:pl-60 min-h-screen bg-bg text-fg">
            <Sidebar />

            {/* ── HERO ── */}
            <section className="pt-20 px-6 py-14 text-center border-b border-border bg-primary-subtle relative overflow-hidden">
                {/* decorative blobs — single-hue, restrained */}
                <div aria-hidden className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-20 blur-3xl"
                    style={{ background: 'radial-gradient(circle,#3b82f6,transparent)' }} />
                <div aria-hidden className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full opacity-10 blur-3xl"
                    style={{ background: 'radial-gradient(circle,#3b82f6,transparent)' }} />

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4 hero-badge">
                        <BookOpen size={13} /> Expert Tutors Available Now
                    </span>
                    <h1 className="text-3xl md:text-5xl font-bold mb-3 gradient-text" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                        Find Your Perfect Tutor
                    </h1>
                    <p className="max-w-xl mx-auto mb-10 text-sm md:text-base text-fg-secondary">
                        Connect with verified experts, book sessions instantly, and achieve your academic goals.
                    </p>

                    {/* Stats row */}
                    <div className="flex justify-center gap-10 md:gap-16 flex-wrap">
                        {[
                            { icon: Users, value: allTutors.length, label: 'Expert Tutors' },
                            { icon: TrendingUp, value: totalStudents + '+', label: 'Students Helped' },
                            { icon: Award, value: avgRating, label: 'Avg. Rating' },
                            { icon: Award, value: '100%', label: 'Verified' },
                        ].map(({ icon: Icon, value, label }) => (
                            <div key={label} className="text-center">
                                <div className="flex items-center justify-center gap-1.5 text-2xl md:text-3xl font-bold tabular-nums text-primary" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                                    <Icon size={20} strokeWidth={2} />
                                    {value}
                                </div>
                                <div className="text-xs mt-0.5 text-fg-secondary">{label}</div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* ── FILTER BAR ── */}
            <div className="sticky top-16 z-30 px-6 py-3 border-b border-border bg-surface">
                <div className="max-w-6xl mx-auto flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                        <Input
                            type="text"
                            placeholder="Search tutors or subjects…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 h-10"
                        />
                    </div>
                    <Select value={subject} onChange={e => setSubject(e.target.value)} className="h-10 min-w-[140px]">
                        <option value="">All Subjects</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="h-10 min-w-[150px]">
                        <option value="rating">Top Rated</option>
                        <option value="reviews">Most Reviews</option>
                        <option value="price_low">Price: Low → High</option>
                        <option value="price_high">Price: High → Low</option>
                    </Select>
                    {(search || subject) && (
                        <button onClick={() => { setSearch(''); setSubject(''); }}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs border border-border text-fg-secondary transition-colors hover:border-danger hover:text-danger">
                            <X size={13} /> Clear
                        </button>
                    )}
                    <span className="text-xs ml-auto text-fg-secondary">
                        {filtered.length} tutor{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* ── GRID ── */}
            <div className="max-w-6xl mx-auto px-6 py-10">
                {filtered.length === 0 ? (
                    <EmptyState icon={SearchX} title="No tutors found" description="Try a different search or clear your filters." />
                ) : (
                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                        variants={stagger} initial="hidden" animate="show"
                    >
                        {filtered.map(tutor => <TutorCard key={tutor.id} tutor={tutor} />)}
                    </motion.div>
                )}
            </div>
        </div>
    );
}

function TutorCard({ tutor }) {
    const price = tutor.pricing?.single?.price;
    const subjects = Array.isArray(tutor.subjects)
        ? tutor.subjects.slice(0, 3).map(s => s.name || s)
        : [];

    return (
        <motion.div variants={cardVariants}>
            <Link to={`/tutor/${tutor.id}`} state={{ name: tutor.name, avatar: tutor.avatar }}
                className="block rounded-2xl border border-border bg-surface overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 group">

                {/* Card header with gradient banner */}
                <div className="relative h-24 flex items-end px-5 pb-0" style={{ background: 'var(--gradient-primary)' }}>
                    <div aria-hidden className="absolute inset-0"
                        style={{ backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,0.03) 0,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 12px)' }} />
                    {/* Avatar overlapping banner */}
                    <div className="relative translate-y-1/2">
                        <TutorAvatar
                            src={tutor.avatar}
                            name={tutor.name}
                            tutorId={tutor.id}
                            size={64}
                            rounded="rounded-xl"
                            className="border-2 shadow-lg"
                        />
                        {tutor.isOnline && (
                            <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-success rounded-full border-2 border-surface" />
                        )}
                    </div>
                </div>

                <div className="px-5 pt-10 pb-5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-base leading-tight text-fg">{tutor.name}</h3>
                        <StarRating value={tutor.rating} size={13} showValue className="shrink-0" />
                    </div>
                    <p className="text-xs mb-3 text-fg-secondary">{tutor.title}</p>

                    {/* Subject tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {subjects.map(s => (
                            <Badge key={s} tone="primary" size="sm">{s}</Badge>
                        ))}
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-xs mb-4 text-fg-secondary">
                        <span className="flex items-center gap-1">
                            <Users size={12} /> {tutor.stats?.totalStudents || 0} students
                        </span>
                        <span>({tutor.totalReviews} reviews)</span>
                    </div>

                    {/* Price + CTA */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div>
                            <span className="font-bold text-base text-primary">
                                {price?.toLocaleString()}
                            </span>
                            <span className="text-xs ml-1 text-fg-secondary">FCFA/session</span>
                        </div>
                        <span className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition-all group-hover:scale-105" style={{ background: 'var(--gradient-primary)' }}>
                            View Profile
                        </span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
