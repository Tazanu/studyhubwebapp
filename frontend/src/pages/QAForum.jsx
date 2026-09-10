import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Plus, Search, Filter, MessageSquare, Eye, TrendingUp,
    CheckCircle, Clock, Volume2, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
// Imperative toast copy comes from the instance, not the hook, so `t` stays out
// of fetch closures and their dependency arrays.
import i18n from '../i18n';
import api from '../api/client';
import { relativeTime } from '../lib/relativeTime';
import Sidebar from '../components/Sidebar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { cn } from '../lib/cn';

// Values are sent to the API, so they stay English; only the label translates.
const CATEGORIES = ['All', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Engineering', 'Medicine', 'Business', 'Other'];
const SORT_OPTIONS = [
    { value: 'recent', labelKey: 'qa.sortRecent', icon: Clock },
    { value: 'votes', labelKey: 'qa.sortVotes', icon: TrendingUp },
    { value: 'unanswered', labelKey: 'qa.sortUnanswered', icon: MessageSquare },
    { value: 'solved', labelKey: 'qa.sortSolved', icon: CheckCircle }
];

function Pill({ active, onClick, children, icon: Icon }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap border',
                active ? 'bg-primary-solid border-primary text-white' : 'bg-surface border-border text-fg-secondary hover:border-primary',
            )}
        >
            {Icon && <Icon size={15} />}
            {children}
        </button>
    );
}

export default function QAForum() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [sort, setSort] = useState('recent');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                sort,
                page,
                limit: 20
            });

            if (search) params.append('search', search);
            if (category !== 'All') params.append('category', category);

            const { data } = await api.get(`/qa?${params}`);
            setQuestions(data.questions);
            setPagination(data.pagination);
        } catch (error) {
            console.error('Failed to fetch questions:', error);
            toast.error(i18n.t('qa.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, [sort, category, page]);

    // Poll every 20s for new questions
    useEffect(() => {
        const timer = setInterval(() => { if (page === 1) fetchQuestions(); }, 20000);
        return () => clearInterval(timer);
    }, [sort, category]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchQuestions();
    };

    const getRelativeTime = (date) => {
        const { key, count } = relativeTime(date);
        return t(key, { count });
    };

    const categoryLabel = cat =>
        cat === 'All' ? t('qa.categoryAll') : t(`subjectName.${cat}`, { defaultValue: cat });

    return (
        <div className="lg:pl-60 min-h-screen bg-bg text-fg">
            <Sidebar />
            <div className="min-h-screen" style={{ paddingTop: '80px' }}>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {t('qa.title')}
                        </h1>
                        <p className="text-sm text-fg-secondary">
                            {t('qa.subtitle')}
                        </p>
                    </div>
                    <Button onClick={() => navigate('/qa/ask')} icon={Plus} size="lg" className="w-full sm:w-auto hover:-translate-y-0.5">
                        {t('qa.askQuestion')}
                    </Button>
                </div>

                <div className="mb-6">
                    <form onSubmit={handleSearch} className="flex gap-3 mb-4">
                        <div className="flex-1 relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                            <Input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('qa.searchPlaceholder')}
                                aria-label={t('qa.searchPlaceholder')}
                                className="pl-10 h-12"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                'px-4 py-3 rounded-sm border-2 transition-all flex items-center gap-2 bg-surface',
                                showFilters ? 'border-primary text-primary' : 'border-border text-fg-secondary hover:border-primary',
                            )}
                        >
                            <Filter size={18} />
                            {t('qa.filters')}
                        </button>
                    </form>

                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 rounded-lg border border-border bg-surface mb-4">
                                <div className="mb-4">
                                    <label className="text-sm font-semibold mb-2 block text-fg">{t('qa.category')}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORIES.map(cat => (
                                            <Pill key={cat} active={category === cat} onClick={() => { setCategory(cat); setPage(1); }}>
                                                {categoryLabel(cat)}
                                            </Pill>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div className="grid grid-cols-2 sm:flex gap-2 sm:overflow-x-auto pb-1">
                        {SORT_OPTIONS.map(option => (
                            <Pill key={option.value} active={sort === option.value} onClick={() => { setSort(option.value); setPage(1); }} icon={option.icon}>
                                {t(option.labelKey)}
                            </Pill>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 size={40} className="animate-spin text-primary" />
                    </div>
                ) : questions.length === 0 ? (
                    <EmptyState
                        icon={MessageSquare}
                        title={t('qa.emptyTitle')}
                        description={t('qa.emptyBody')}
                        action={<Button onClick={() => navigate('/qa/ask')}>{t('qa.askQuestion')}</Button>}
                    />
                ) : (
                    <div className="space-y-4">
                        {questions.map(question => (
                            <Link
                                key={question.id}
                                to={`/qa/${question.id}`}
                                className="block p-5 rounded-lg border border-border bg-surface transition-all hover:border-primary hover:-translate-y-0.5"
                            >
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex sm:flex-col gap-4 sm:gap-2 items-center sm:items-center min-w-[60px]">
                                        <div className="text-center">
                                            <div className={cn('text-lg font-bold', question.votes > 0 ? 'text-success' : 'text-fg')}>
                                                {question.votes}
                                            </div>
                                            <div className="text-xs text-fg-muted">{t('qa.votes')}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className={cn('text-lg font-bold', question.is_solved ? 'text-primary' : 'text-fg')}>
                                                {question.answers_count}
                                            </div>
                                            <div className="text-xs text-fg-muted">{t('qa.answers')}</div>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-start gap-2 mb-2">
                                            <h3 className="text-lg font-semibold hover:text-primary transition-colors" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                                {question.title}
                                            </h3>
                                            {question.is_solved && (
                                                <CheckCircle size={20} className="text-success shrink-0" />
                                            )}
                                            {question.audio_url && (
                                                <Volume2 size={18} className="text-primary shrink-0" />
                                            )}
                                        </div>

                                        <p className="text-sm mb-3 line-clamp-2 text-fg-secondary">
                                            {question.content}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-3 text-xs text-fg-muted">
                                            {question.tags.slice(0, 3).map(tag => (
                                                <Badge key={tag} tone="primary" size="sm">#{tag}</Badge>
                                            ))}
                                            <span className="flex items-center gap-1">
                                                <Eye size={14} />
                                                {t('qa.views', { count: question.views ?? 0 })}
                                            </span>
                                            <span>
                                                {t('qa.askedBy', { time: getRelativeTime(question.created_at) })}{' '}
                                                <span className="font-medium text-primary">
                                                    {question.users.first_name} {question.users.last_name}
                                                </span>
                                                <span className="ml-1 text-warning">
                                                    ({question.users.reputation})
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {pagination && pagination.pages > 1 && (
                    <div className="flex justify-center gap-2 mt-8">
                        <Button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            variant="secondary"
                        >
                            {t('qa.previous')}
                        </Button>
                        <span className="px-4 py-2 flex items-center text-fg-secondary">
                            {t('qa.pageOf', { page, total: pagination.pages })}
                        </span>
                        <Button
                            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                            disabled={page === pagination.pages}
                            variant="secondary"
                        >
                            {t('qa.next')}
                        </Button>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}
