import { motion } from 'framer-motion';
import { MessageSquare, Users, CheckCircle, Clock, TrendingUp, Globe, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TutorAvatar from './TutorAvatar';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import StarRating from '../ui/StarRating';

export default function TutorHero({ tutor, scrollToBooking, openMessageModal }) {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleFreeTrial = () => {
        if (!user) { toast.error('Please log in to book a session'); navigate('/login'); return; }
        scrollToBooking?.();
        toast.info('Select your preferred time slot below');
    };

    const handleMessage = () => {
        if (!user) { toast.error('Please log in to message a tutor'); navigate('/login'); return; }
        openMessageModal?.();
    };

    return (
        <section className="relative border-b border-border bg-surface overflow-hidden">

            {/* Gradient banner */}
            <div className="h-40 md:h-52 relative" style={{ background: 'var(--gradient-primary)' }}>
                <div aria-hidden className="absolute inset-0"
                    style={{ backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,0.04) 0,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 14px)' }} />
                <div aria-hidden className="absolute bottom-0 left-0 right-0 h-16"
                    style={{ background: 'linear-gradient(to top,var(--surface-card),transparent)' }} />
                <button
                    onClick={() => navigate('/tutors')}
                    className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all hover:bg-white/20"
                >
                    <ArrowLeft size={16} /> Back to Tutors
                </button>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10">
                {/* Avatar — pulled up over banner */}
                <div className="-mt-16 mb-4">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        className="relative inline-block"
                    >
                        <TutorAvatar
                            src={tutor.avatar}
                            name={tutor.name}
                            tutorId={tutor.id}
                            size={tutor.isOwn ? 144 : 128}
                            rounded="rounded-2xl"
                            isOwn={tutor.isOwn}
                            onUpload={tutor.onUpload}
                            className="border-4 shadow-2xl"
                        />
                        {tutor.isOnline && (
                            <span className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white bg-success">
                                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                                Online
                            </span>
                        )}
                    </motion.div>
                </div>

                {/* Name + actions — always below the avatar, never overlapping banner */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                        <h1 className="text-2xl md:text-4xl font-bold leading-tight text-fg" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{tutor.name}</h1>
                        <p className="text-sm md:text-base mt-1 text-fg-secondary">{tutor.title}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <StarRating value={tutor.rating} size={14} showValue />
                            <span className="text-xs text-fg-secondary">({tutor.totalReviews} reviews)</span>
                            <span className="flex items-center gap-1 text-xs text-fg-secondary">
                                <Globe size={12} /> {tutor.availability?.timezone}
                            </span>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                        className="flex gap-3 flex-wrap shrink-0"
                    >
                        <Button onClick={handleFreeTrial} className="hover:scale-105">
                            Book a Session
                        </Button>
                        <Button onClick={handleMessage} variant="secondary" icon={MessageSquare}>
                            Message
                        </Button>
                    </motion.div>
                </div>

                {/* Subject tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {tutor.subjects.map((s, i) => (
                        <motion.span key={i}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                        >
                            <Badge tone="primary" size="md">{s.name}</Badge>
                        </motion.span>
                    ))}
                </div>

                {/* Stats grid */}
                <motion.div
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                >
                    {[
                        { icon: Users, value: tutor.stats.totalStudents, label: 'Students' },
                        { icon: CheckCircle, value: tutor.stats.sessionsCompleted, label: 'Sessions' },
                        { icon: TrendingUp, value: `${tutor.stats.responseRate}%`, label: 'Response Rate' },
                        { icon: Clock, value: `${tutor.stats.yearsExperience} yrs`, label: 'Experience' },
                    ].map(({ icon: Icon, value, label }) => (
                        <div key={label} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-bg">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary-subtle">
                                <Icon size={18} className="text-primary" />
                            </div>
                            <div>
                                <div className="font-bold text-base leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{value}</div>
                                <div className="text-xs text-fg-secondary">{label}</div>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
