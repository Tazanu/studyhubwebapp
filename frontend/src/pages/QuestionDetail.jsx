import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, ThumbsUp, ThumbsDown, Bookmark, Bell, MessageSquare,
    Check, Mic, MicOff, Image as ImageIcon, X, Volume2, Eye, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

export default function QuestionDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [answerContent, setAnswerContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [recording, setRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioURL, setAudioURL] = useState('');

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

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

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioURL(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.start();
            setRecording(true);
        } catch (error) {
            toast.error('Failed to start recording');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
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
            setAudioBlob(null);
            setAudioURL('');
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
            <div className="lg:pl-60" style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
                <Sidebar />
                <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-main)', paddingTop: '80px' }}>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent-blue)' }} />
                </div>
            </div>
        );
    }

    if (!question) return null;

    const isAuthor = question.author_id === user?.id;

    return (
        <div className="lg:pl-60" style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
            <Sidebar />
            <div className="min-h-screen" style={{ background: 'var(--bg-main)', color: 'var(--text-primary)', paddingTop: '80px' }}>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                
                {/* Header */}
                <button
                    onClick={() => navigate('/qa')}
                    className="flex items-center gap-2 mb-6 hover:text-blue-500 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
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
                                className={`p-2 rounded-lg transition-all ${question.userVote === 1 ? 'text-green-500' : 'hover:bg-green-500 hover:text-white'}`}
                                style={{ color: question.userVote === 1 ? '#34d399' : 'var(--text-secondary)' }}
                            >
                                <ThumbsUp size={22} />
                            </button>
                            <span className="text-xl font-bold" style={{ color: question.votes > 0 ? '#34d399' : 'var(--text-primary)' }}>
                                {question.votes}
                            </span>
                            <button
                                onClick={() => handleVote(-1)}
                                className={`p-2 rounded-lg transition-all ${question.userVote === -1 ? 'text-red-500' : 'hover:bg-red-500 hover:text-white'}`}
                                style={{ color: question.userVote === -1 ? '#ef4444' : 'var(--text-secondary)' }}
                            >
                                <ThumbsDown size={22} />
                            </button>
                            <button
                                onClick={handleBookmark}
                                className="p-2 rounded-lg transition-all hover:text-blue-500"
                                style={{ color: question.isBookmarked ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
                            >
                                <Bookmark size={18} fill={question.isBookmarked ? 'currentColor' : 'none'} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <h1 className="text-xl sm:text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                    {question.title}
                                </h1>
                                {question.is_solved && (
                                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-500 text-white whitespace-nowrap">
                                        Solved
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-3 mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                                <span className="flex items-center gap-1">
                                    <Eye size={16} />
                                    {question.views} views
                                </span>
                                <span>Asked by <span className="font-semibold" style={{ color: 'var(--accent-blue)' }}>{question.users.first_name} {question.users.last_name}</span></span>
                                <span style={{ color: '#fbbf24' }}>Reputation: {question.users.reputation}</span>
                            </div>

                            <div className="p-6 rounded-lg border mb-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                                <p className="whitespace-pre-wrap mb-4">{question.content}</p>

                                {question.audio_url && (
                                    <div className="mb-4 p-3 rounded-lg flex items-center gap-3" style={{ background: 'var(--bg-main)' }}>
                                        <Volume2 size={20} style={{ color: 'var(--accent-blue)' }} />
                                        <audio src={`${API_ORIGIN}${question.audio_url}`} controls className="flex-1" />
                                    </div>
                                )}

                                {question.images?.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                        {question.images.map((img, i) => (
                                            <img key={i} src={`${API_ORIGIN}${img}`} alt={`Question image ${i + 1}`} className="rounded-lg w-full" />
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {question.tags.map(tag => (
                                        <span key={tag} className="px-3 py-1 rounded-full text-sm" style={{ background: 'rgba(0, 102, 255, 0.1)', color: 'var(--accent-blue)' }}>
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleFollow}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all hover:border-blue-500"
                                style={{ borderColor: question.isFollowing ? 'var(--accent-blue)' : 'var(--border-subtle)', color: question.isFollowing ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
                            >
                                <Bell size={18} fill={question.isFollowing ? 'currentColor' : 'none'} />
                                {question.isFollowing ? 'Following' : 'Follow'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Answers */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {question.answers.length} {question.answers.length === 1 ? 'Answer' : 'Answers'}
                    </h2>

                    {question.answers.map(answer => (
                        <div key={answer.id} className="mb-6 p-4 sm:p-6 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: answer.is_accepted ? '#34d399' : 'var(--border-subtle)' }}>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex sm:flex-col flex-row items-center gap-2 shrink-0">
                                    <button onClick={() => handleVote(1, true, answer.id)} className="p-2 rounded-lg transition-all hover:bg-green-500 hover:text-white">
                                        <ThumbsUp size={20} />
                                    </button>
                                    <span className="text-xl font-bold">{answer.votes}</span>
                                    <button onClick={() => handleVote(-1, true, answer.id)} className="p-2 rounded-lg transition-all hover:bg-red-500 hover:text-white">
                                        <ThumbsDown size={20} />
                                    </button>
                                    {isAuthor && !question.is_solved && (
                                        <button
                                            onClick={() => handleAcceptAnswer(answer.id)}
                                            className="p-2 rounded-lg transition-all hover:bg-green-500 hover:text-white mt-2"
                                            title="Accept as best answer"
                                        >
                                            <Check size={20} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1">
                                    {answer.is_accepted && (
                                        <div className="flex items-center gap-2 mb-3 text-green-500 font-semibold">
                                            <Check size={20} />
                                            Accepted Answer
                                        </div>
                                    )}

                                    <p className="whitespace-pre-wrap mb-4">{answer.content}</p>

                                    {answer.audio_url && (
                                        <div className="mb-4 p-3 rounded-lg flex items-center gap-3" style={{ background: 'var(--bg-main)' }}>
                                            <Volume2 size={18} style={{ color: 'var(--accent-blue)' }} />
                                            <audio src={`${API_ORIGIN}${answer.audio_url}`} controls className="flex-1" />
                                        </div>
                                    )}

                                    <div className="text-sm flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}>
                                        <span>by <span className="font-semibold" style={{ color: 'var(--accent-blue)' }}>{answer.users.first_name} {answer.users.last_name}</span></span>
                                        <span style={{ color: '#fbbf24' }}>({answer.users.reputation})</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Answer Form */}
                <div className="p-6 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                    <h3 className="text-xl font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Your Answer</h3>
                    <form onSubmit={handleSubmitAnswer} className="space-y-4">
                        <textarea
                            value={answerContent}
                            onChange={(e) => setAnswerContent(e.target.value)}
                            placeholder="Write your answer..."
                            rows={6}
                            className="w-full px-4 py-3 rounded-lg border outline-none transition-all resize-none"
                            style={{ background: 'var(--bg-main)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                        />

                        {!audioURL ? (
                            <button
                                type="button"
                                onClick={recording ? stopRecording : startRecording}
                                className={`px-4 py-2 rounded-lg font-semibold text-white flex items-center gap-2 ${recording ? 'animate-pulse' : ''}`}
                                style={{ background: recording ? '#ef4444' : 'var(--accent-blue)' }}
                            >
                                {recording ? <MicOff size={18} /> : <Mic size={18} />}
                                {recording ? 'Stop Recording' : 'Add Voice Answer'}
                            </button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <audio src={audioURL} controls className="flex-1" />
                                <button type="button" onClick={() => { setAudioBlob(null); setAudioURL(''); }} className="p-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            style={{ background: 'linear-gradient(135deg, #0052cc, #0066ff)' }}
                        >
                            {submitting && <Loader2 size={18} className="animate-spin" />}
                            {submitting ? 'Posting...' : 'Post Answer'}
                        </button>
                    </form>
                </div>
                </div>
            </div>
        </div>
    );
}
