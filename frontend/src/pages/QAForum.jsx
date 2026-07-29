import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Plus, Search, Filter, MessageSquare, Eye, TrendingUp,
    CheckCircle, Clock, Bookmark, Volume2
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../api/client';
import Sidebar from '../components/Sidebar';

const CATEGORIES = ['All', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Engineering', 'Medicine', 'Business', 'Other'];
const SORT_OPTIONS = [
    { value: 'recent', label: 'Most Recent', icon: Clock },
    { value: 'votes', label: 'Most Voted', icon: TrendingUp },
    { value: 'unanswered', label: 'Unanswered', icon: MessageSquare },
    { value: 'solved', label: 'Solved', icon: CheckCircle }
];

export default function QAForum() {
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
            toast.error('Failed to load questions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, [sort, category, page]);

    // Poll every 20s for new questions
    useEffect(() => {
        const t = setInterval(() => { if (page === 1) fetchQuestions(); }, 20000);
        return () => clearInterval(t);
    }, [sort, category]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchQuestions();
    };

    const getRelativeTime = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'week', seconds: 604800 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 }
        ];

        for (const interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) {
                return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
            }
        }
        return 'just now';
    };

    return (
        <div className="lg:pl-60" style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
            <Sidebar />
            <div className="min-h-screen" style={{ background: 'var(--bg-main)', color: 'var(--text-primary)', paddingTop: '80px' }}>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            Q&A Forum
                        </h1>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Ask questions, share knowledge, and learn from peers
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/qa/ask')}
                        className="px-6 py-3 rounded-lg font-semibold text-white flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg w-full sm:w-auto justify-center"
                        style={{ background: 'linear-gradient(135deg, #0052cc, #0066ff)' }}
                    >
                        <Plus size={20} />
                        Ask Question
                    </button>
                </div>

                <div className="mb-6">
                    <form onSubmit={handleSearch} className="flex gap-3 mb-4">
                        <div className="flex-1 relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search questions..."
                                className="w-full pl-10 pr-4 py-3 rounded-lg border outline-none transition-all"
                                style={{
                                    background: 'var(--bg-card)',
                                    borderColor: 'var(--border-subtle)',
                                    color: 'var(--text-primary)'
                                }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-4 py-3 rounded-lg border transition-all hover:border-blue-500 flex items-center gap-2"
                            style={{
                                background: 'var(--bg-card)',
                                borderColor: showFilters ? 'var(--accent-blue)' : 'var(--border-subtle)',
                                color: showFilters ? 'var(--accent-blue)' : 'var(--text-secondary)'
                            }}
                        >
                            <Filter size={18} />
                            Filters
                        </button>
                    </form>

                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 rounded-lg border mb-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                                <div className="mb-4">
                                    <label className="text-sm font-semibold mb-2 block">Category</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => { setCategory(cat); setPage(1); }}
                                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                                                style={{
                                                    background: category === cat ? 'var(--accent-blue)' : 'var(--bg-main)',
                                                    color: category === cat ? '#fff' : 'var(--text-secondary)',
                                                    border: `1px solid ${category === cat ? 'var(--accent-blue)' : 'var(--border-subtle)'}`
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div className="grid grid-cols-2 sm:flex gap-2 sm:overflow-x-auto pb-1">
                        {SORT_OPTIONS.map(option => {
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => { setSort(option.value); setPage(1); }}
                                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                                    style={{
                                        background: sort === option.value ? 'var(--accent-blue)' : 'var(--bg-card)',
                                        color: sort === option.value ? '#fff' : 'var(--text-secondary)',
                                        border: `1px solid ${sort === option.value ? 'var(--accent-blue)' : 'var(--border-subtle)'}`
                                    }}
                                >
                                    <Icon size={15} />
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent-blue)' }} />
                    </div>
                ) : questions.length === 0 ? (
                    <div className="text-center py-20">
                        <MessageSquare size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                        <h3 className="text-xl font-semibold mb-2">No questions found</h3>
                        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                            Be the first to ask a question!
                        </p>
                        <button
                            onClick={() => navigate('/qa/ask')}
                            className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:-translate-y-0.5"
                            style={{ background: 'linear-gradient(135deg, #0052cc, #0066ff)' }}
                        >
                            Ask Question
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {questions.map(question => (
                            <Link
                                key={question.id}
                                to={`/qa/${question.id}`}
                                className="block p-5 rounded-lg border transition-all hover:border-blue-500 hover:-translate-y-0.5"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                            >
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex sm:flex-col gap-4 sm:gap-2 items-center sm:items-center min-w-[60px]">
                                        <div className="text-center">
                                            <div className="text-lg font-bold" style={{ color: question.votes > 0 ? '#34d399' : 'var(--text-primary)' }}>
                                                {question.votes}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>votes</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold" style={{ color: question.is_solved ? '#0066ff' : 'var(--text-primary)' }}>
                                                {question.answers_count}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>answers</div>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-start gap-2 mb-2">
                                            <h3 className="text-lg font-semibold hover:text-blue-500 transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                                {question.title}
                                            </h3>
                                            {question.is_solved && (
                                                <CheckCircle size={20} className="text-green-500 shrink-0" />
                                            )}
                                            {question.audio_url && (
                                                <Volume2 size={18} className="text-blue-500 shrink-0" />
                                            )}
                                        </div>
                                        
                                        <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                                            {question.content}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {question.tags.slice(0, 3).map(tag => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-1 rounded"
                                                    style={{ background: 'rgba(0, 102, 255, 0.1)', color: 'var(--accent-blue)' }}
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                            <span className="flex items-center gap-1">
                                                <Eye size={14} />
                                                {question.views} views
                                            </span>
                                            <span>
                                                asked {getRelativeTime(question.created_at)} by{' '}
                                                <span className="font-medium" style={{ color: 'var(--accent-blue)' }}>
                                                    {question.users.first_name} {question.users.last_name}
                                                </span>
                                                <span className="ml-1" style={{ color: '#fbbf24' }}>
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
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 flex items-center" style={{ color: 'var(--text-secondary)' }}>
                            Page {page} of {pagination.pages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                            disabled={page === pagination.pages}
                            className="px-4 py-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                        >
                            Next
                        </button>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}
