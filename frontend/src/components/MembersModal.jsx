import { useState, useEffect } from 'react';
import { Loader2, UserCheck, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { toast } from 'sonner';
import i18n from '../i18n';
import Modal from './ui/Modal';
import UserAvatar from './ui/UserAvatar';

export default function MembersModal({ open, groupId, onClose }) {
    const { t } = useTranslation();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!open || !groupId) return;
        const loadMembers = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/groups/${groupId}/members`);
                setMembers(data);
            } catch (err) {
                console.warn('Members endpoint not implemented yet:', err);
                toast.error(i18n.t('members.loadFailed'));
                setMembers([]);
            } finally {
                setLoading(false);
            }
        };
        loadMembers();
    }, [open, groupId]);

    return (
        <Modal open={open} onClose={onClose} title={t('members.title')} size="md">
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-primary" />
                </div>
            ) : members.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-sm text-fg-secondary">{t('members.empty')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {members.map(member => (
                        <div
                            key={member.user_id}
                            className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-surface-hover"
                        >
                            <UserAvatar
                                src={member.users?.profile_picture}
                                firstName={member.users?.first_name}
                                lastName={member.users?.last_name}
                                size={40}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate text-fg">
                                    {member.users?.first_name} {member.users?.last_name}
                                </p>
                                <p className="text-xs truncate text-fg-secondary">
                                    {member.users?.field_of_study
                                        ? t(`subjectName.${member.users.field_of_study}`, { defaultValue: member.users.field_of_study })
                                        : t('members.student')}
                                </p>
                            </div>
                            {member.role === 'owner' ? (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-warning-bg text-warning">
                                    <Crown size={12} />
                                    {t('members.owner')}
                                </div>
                            ) : (
                                <div className="text-fg-secondary">
                                    <UserCheck size={16} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}
