import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import api, { apiError } from '../api/client';
import Button from './ui/Button';
import { mediaUrl } from '../lib/mediaUrl';


export default function JoinRequestsPanel({ groupId, isAdmin }) {
    const { t } = useTranslation();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);

    const fetchRequests = async () => {
        if (!isAdmin) return;
        try {
            const { data } = await api.get(`/groups/${groupId}/requests`);
            setRequests(data);
        } catch (err) {
            console.error('Failed to fetch join requests:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, [groupId, isAdmin]);

    const handleApprove = async (requestId) => {
        setProcessing(requestId);
        try {
            await api.post(`/groups/${groupId}/requests/${requestId}/approve`);
            toast.success(t('joinRequests.approved'));
            fetchRequests();
        } catch (err) {
            toast.error(apiError(err, t('joinRequests.approveFailed')));
        } finally {
            setProcessing(null);
        }
    };

    const handleDeny = async (requestId) => {
        setProcessing(requestId);
        try {
            await api.post(`/groups/${groupId}/requests/${requestId}/deny`);
            toast.success(t('joinRequests.denied'));
            fetchRequests();
        } catch (err) {
            toast.error(apiError(err, t('joinRequests.denyFailed')));
        } finally {
            setProcessing(null);
        }
    };

    if (!isAdmin) return null;

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-primary" />
            </div>
        );
    }

    if (requests.length === 0) return null;

    return (
        <div className="px-5 py-4 border-b border-border bg-primary-subtle/60">
            <h3 className="text-sm font-semibold mb-3 text-fg">
                {t('joinRequests.title', { n: requests.length })}
            </h3>
            <div className="space-y-2">
                {requests.map((req) => (
                    <motion.div
                        key={req.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface"
                    >
                        <div className="flex items-center gap-3">
                            {req.users.profile_picture ? (
                                <img
                                    src={mediaUrl(req.users.profile_picture)}
                                    alt={req.users.first_name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                    style={{ background: 'var(--gradient-primary)' }}
                                >
                                    {req.users.first_name[0]}{req.users.last_name[0]}
                                </div>
                            )}
                            <div>
                                <div className="font-semibold text-sm text-fg">
                                    {req.users.first_name} {req.users.last_name}
                                </div>
                                <div className="text-xs text-fg-secondary">
                                    {req.users.university} · {t(`subjectName.${req.users.field_of_study}`, { defaultValue: req.users.field_of_study })}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => handleApprove(req.id)}
                                disabled={processing === req.id}
                                loading={processing === req.id}
                                icon={processing === req.id ? undefined : Check}
                                size="sm"
                                className="!bg-[image:none] bg-success hover:brightness-110"
                            >
                                {t('joinRequests.approve')}
                            </Button>
                            <Button
                                onClick={() => handleDeny(req.id)}
                                disabled={processing === req.id}
                                loading={processing === req.id}
                                icon={processing === req.id ? undefined : X}
                                size="sm"
                                variant="danger"
                            >
                                {t('joinRequests.deny')}
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
