import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ThumbsUp, ThumbsDown, Bookmark, Bell, Check, Mic, MicOff,
    X, Volume2, Eye, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { cn } from '../lib/cn';
import { mediaUrl } from '../lib/mediaUrl';


export default function QuestionDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [answerContent, setAnswerContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { recording, audioBlob, audioURL, startRecording, stopRecording, resetRecording } = useAudioRecorder();

    const fetchQuestion = async () => {
        try {
            const { data } = await api.get(`/qa/${id}`);
            setQuestion(data);
        } catch (error) {
            console.error('Failed to fetch question:', error);
            toast.error('Failed to load question');
            navigate('/qa');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestion();
    }, [id]);

    const handleVote = async (type, isAnswer = false, answerId = null) => {
        try {
            const endpoint = isAnswer ? `/qa/${id}/answers/${answerId}/vote` : `/qa/${id}/vote`;
            await api.post(endpoint, { voteType: type });
            fetchQuestion();
        } catch (error) {
            toast.error('Failed to vote');
        }
    };

    const handleBookmark = async () => {
        try {
            await api.post(`/qa/${id}/bookmark`);
            fetchQuestion();
            toast.success(question.isBookmarked ? 'Bookmark removed' : 'Bookmarked');
        } catch (error) {
            toast.error('Failed to bookmark');
        }
    };

    const handleFollow = async () => {
        try {
            await api.post(`/qa/${id}/follow`);
            fetchQuestion();
            toast.success(question.isFollowing ? 'Unfollowed' : 'Following');
        } catch (error) {
            toast.error('Failed to follow');
        }
    };

    const handleSubmitAnswer = async (e) => {
        e.preventDefault();
        if (!answerContent.trim() && !audioBlob) {
            toast.error('Please provide an answer');
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('content', answerContent.trim());
            if (audioBlob) formData.append('audio', audioBlob, 'answer-audio.webm');

            await api.post(`/qa/${id}/answers`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('Answer posted!');
            setAnswerContent('');
            resetRecording();
            fetchQuestion();
        } catch (error) {
            toast.error('Failed to post answer');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAcceptAnswer = async (answerId) => {
        try {
            await api.post(`/qa/${id}/answers/${answerId}/accept`);
            toast.success('Answer accepted!');
            fetchQuestion();
        } catch (error) {
            toast.error('Failed to accept answer');
        }
    };

    if (loading) {
        return (
            <div className="lg:pl-60 min-h-screen bg-bg">
                <Sidebar />
                <div className="min-h-screen flex items-center justify-center" style={{ paddingTop: '80px' }}>
                    <Loader2 size={40} className="animate-spin text-primary" />
                </div>
            </div>
        );
    }

    if (!question) return null;

    const isAuthor = question.author_id === user?.id;

    return (
        <div className="lg:pl-60 min-h-screen bg-bg text-fg">
            <Sidebar />
            <div className="min-h-screen" style={{ paddingTop: '80px' }}>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

                {/* Header */}
                <button
                    onClick={() => navigate('/qa')}
                    className="flex items-center gap-2 mb-6 text-fg-secondary hover:text-primary transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Questions
                </button>

                {/* Question */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                        {/* Votes */}
                        <div className="flex sm:flex-col flex-row items-center gap-2 shrink-0">
                            <button
                                onClick={() => handleVote(1)}
                                className={cn('p-2 rounded-lg transition-all', question.userVote === 1 ? 'text-success' : 'text-fg-secondary hover:bg-success hover:text-white')}
                            >
                                <ThumbsUp size={22} />
                            </button>
                            <span className={cn('text-xl font-bold', question.votes > 0 ? 'text-success' : 'text-fg')}>
                                {question.votes}
                            </span>
                            <button
                                onClick={() => handleVote(-1)}
                                className={cn('p-2 rounded-lg transition-all', question.userVote === -1 ? 'text-danger' : 'text-fg-secondary hover:bg-danger hover:text-white')}
                            >
                                <ThumbsDown size={22} />
                            </button>
                            <button
                                onClick={handleBookmark}
                                className={cn('p-2 rounded-lg transition-all hover:text-primary', question.isBookmarked ? 'text-primary' : 'text-fg-secondary')}
                            >
                                <Bookmark size={18} fill={question.isBookmarked ? 'currentColor' : 'none'} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <h1 className="text-xl sm:text-3xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    {question.title}
                                </h1>
                                {question.is_solved && (
                                    <Badge tone="success" className="whitespace-nowrap">Solved</Badge>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-3 mb-4 text-sm text-fg-muted">
                                <span className="flex items-center gap-1">
                                    <Eye size={16} />
                                    {question.views} views
                                </span>
                                <span>Asked by <span className="font-semibold text-primary">{question.users.first_name} {question.users.last_name}</span></span>
                                <span className="text-warning">Reputation: {question.users.reputation}</span>
                            </div>

                            <div className="p-6 rounded-lg border border-border bg-surface mb-4">
                                <p className="whitespace-pre-wrap mb-4">{question.content}</p>

                                {question.audio_url && (
                                    <div className="mb-4 p-3 rounded-lg flex items-center gap-3 bg-bg">
                                        <Volume2 size={20} className="text-primary" />
                                        <audio src={mediaUrl(question.audio_url)} controls className="flex-1" />
                                    </div>
                                )}

                                {question.images?.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                        {question.images.map((img, i) => (
                                            <img key={i} src={mediaUrl(img)} alt={`Question image ${i + 1}`} className="rounded-lg w-full" />
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {question.tags.map(tag => (
                                        <Badge key={tag} tone="primary">#{tag}</Badge>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleFollow}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2 rounded-md border-2 transition-all hover:border-primary',
                                    question.isFollowing ? 'border-primary text-primary' : 'border-border text-fg-secondary',
                                )}
                            >
                                <Bell size={18} fill={question.isFollowing ? 'currentColor' : 'none'} />
                                {question.isFollowing ? 'Following' : 'Follow'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Answers */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {question.answers.length} {question.answers.length === 1 ? 'Answer' : 'Answers'}
                    </h2>

                    {question.answers.map(answer => (
                        <div key={answer.id} className={cn('mb-6 p-4 sm:p-6 rounded-lg border bg-surface', answer.is_accepted ? 'border-success' : 'border-border')}>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex sm:flex-col flex-row items-center gap-2 shrink-0">
                                    <button onClick={() => handleVote(1, true, answer.id)} className="p-2 rounded-lg transition-all text-fg-secondary hover:bg-success hover:text-white">
                                        <ThumbsUp size={20} />
                                    </button>
                                    <span className="text-xl font-bold">{answer.votes}</span>
                                    <button onClick={() => handleVote(-1, true, answer.id)} className="p-2 rounded-lg transition-all text-fg-secondary hover:bg-danger hover:text-white">
                                        <ThumbsDown size={20} />
                                    </button>
                                    {isAuthor && !question.is_solved && (
                                        <button
                                            onClick={() => handleAcceptAnswer(answer.id)}
                                            className="p-2 rounded-lg transition-all mt-2 text-fg-secondary hover:bg-success hover:text-white"
                                            title="Accept as best answer"
                                        >
                                            <Check size={20} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1">
                                    {answer.is_accepted && (
                                        <div className="flex items-center gap-2 mb-3 text-success font-semibold">
                                            <Check size={20} />
                                            Accepted Answer
                                        </div>
                                    )}

                                    <p className="whitespace-pre-wrap mb-4">{answer.content}</p>

                                    {answer.audio_url && (
                                        <div className="mb-4 p-3 rounded-lg flex items-center gap-3 bg-bg">
                                            <Volume2 size={18} className="text-primary" />
                                            <audio src={mediaUrl(answer.audio_url)} controls className="flex-1" />
                                        </div>
                                    )}

                                    <div className="text-sm flex items-center gap-3 text-fg-secondary">
                                        <span>by <span className="font-semibold text-primary">{answer.users.first_name} {answer.users.last_name}</span></span>
                                        <span className="text-warning">({answer.users.reputation})</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Answer Form */}
                <div className="p-6 rounded-lg border border-border bg-surface">
                    <h3 className="text-xl font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Your Answer</h3>
                    <form onSubmit={handleSubmitAnswer} className="space-y-4">
                        <Textarea
                            value={answerContent}
                            onChange={(e) => setAnswerContent(e.target.value)}
                            placeholder="Write your answer..."
                            rows={6}
                        />

                        {!audioURL ? (
                            <Button
                                type="button"
                                onClick={recording ? stopRecording : startRecording}
                                icon={recording ? MicOff : Mic}
                                variant={recording ? 'danger' : 'primary'}
                                className={recording ? 'animate-pulse' : ''}
                            >
                                {recording ? 'Stop Recording' : 'Add Voice Answer'}
                            </Button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <audio src={audioURL} controls className="flex-1" />
                                <button type="button" onClick={resetRecording} className="p-2 rounded-lg text-fg-secondary hover:bg-danger hover:text-white transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                        )}

                        <Button type="submit" disabled={submitting} loading={submitting} size="lg" className="hover:-translate-y-0.5">
                            {submitting ? 'Posting...' : 'Post Answer'}
                        </Button>
                    </form>
                </div>
                </div>
            </div>
        </div>
    );
}
