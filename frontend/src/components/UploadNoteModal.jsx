import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import api, { apiError } from '../api/client';
import Modal from './ui/Modal';
import Field from './ui/Field';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import Select from './ui/Select';
import Button from './ui/Button';
import { cn } from '../lib/cn';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function UploadNoteModal({ open, onClose, onUploaded, canMarkPremium = false }) {
    const { t } = useTranslation();
    const [form, setForm] = useState({
        title: '',
        description: '',
        subject: '',
        tags: '',
        groupId: '',
        isPremium: false,
        price: ''
    });
    const [file, setFile] = useState(null);
    const [groups, setGroups] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [errors, setErrors] = useState({});

    const fileInputRef = useRef(null);
    const firstInputRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        api.get('/groups').then(({ data }) => {
            setGroups(data.filter(g => g.isMember));
        }).catch(() => {});
    }, [open]);

    const handleDrag = e => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = e => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = e => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = file => {
        setErrors(prev => ({ ...prev, file: '' }));

        if (file.size > MAX_FILE_SIZE) {
            setErrors(prev => ({ ...prev, file: t('uploadNote.fileTooLarge') }));
            return;
        }

        setFile(file);
    };

    const handleSubmit = async e => {
        e.preventDefault();

        const newErrors = {};
        if (!form.title) newErrors.title = t('uploadNote.titleRequired');
        if (!form.description) newErrors.description = t('uploadNote.descriptionRequired');
        if (!form.subject) newErrors.subject = t('uploadNote.subjectRequired');
        if (!file) newErrors.file = t('uploadNote.fileRequired');
        if (form.isPremium && (!form.price || parseFloat(form.price) <= 0)) {
            newErrors.price = t('uploadNote.priceRequired');
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('title', form.title);
        formData.append('description', form.description);
        formData.append('subject', form.subject);
        formData.append('tags', form.tags);
        if (form.groupId) formData.append('groupId', form.groupId);
        formData.append('isPremium', form.isPremium ? 'true' : 'false');
        if (form.isPremium && form.price) formData.append('price', form.price);
        formData.append('file', file);

        try {
            await api.post('/notes', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            onUploaded();
        } catch (err) {
            toast.error(apiError(err, t('uploadNote.uploadFailed')));
            setUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <Modal
            open={open}
            onClose={uploading ? () => {} : onClose}
            closeOnBackdrop={!uploading}
            closeOnEscape={!uploading}
            title={t('uploadNote.title')}
            size="lg"
            initialFocusRef={firstInputRef}
            footer={
                <>
                    <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={uploading}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" form="upload-note-form" size="sm" loading={uploading} icon={uploading ? undefined : Upload}>
                        {uploading ? t('uploadNote.uploading') : t('uploadNote.title')}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} id="upload-note-form">
                <Field label={t('uploadNote.titleLabel')} required error={errors.title}>
                    <Input
                        ref={firstInputRef}
                        type="text"
                        value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        placeholder={t('uploadNote.titlePlaceholder')}
                        invalid={!!errors.title}
                    />
                </Field>

                <Field label={t('uploadNote.descriptionLabel')} required error={errors.description}>
                    <Textarea
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder={t('uploadNote.descriptionPlaceholder')}
                        rows={3}
                        invalid={!!errors.description}
                    />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={t('uploadNote.subjectLabel')} required error={errors.subject}>
                        <Input
                            type="text"
                            value={form.subject}
                            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                            placeholder={t('uploadNote.subjectPlaceholder')}
                            invalid={!!errors.subject}
                        />
                    </Field>
                    <Field label={t('uploadNote.tagsLabel')} hint={t('uploadNote.tagsHint')}>
                        <Input
                            type="text"
                            value={form.tags}
                            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                            placeholder={t('uploadNote.tagsPlaceholder')}
                        />
                    </Field>
                </div>

                {groups.length > 0 && (
                    <Field label={t('uploadNote.shareWithGroup')} hint={t('common.optional').toLowerCase()}>
                        <Select value={form.groupId} onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))}>
                            <option value="">{t('uploadNote.noGroup')}</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </Select>
                    </Field>
                )}

                <Field label={t('uploadNote.fileLabel')} required>
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                            dragActive ? 'border-primary bg-primary-subtle' : errors.file ? 'border-danger' : 'border-border bg-surface-hover',
                        )}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp"
                        />
                        <Upload size={32} className="mx-auto mb-3 text-primary" />
                        {file ? (
                            <div>
                                <p className="font-semibold mb-1 text-fg">{file.name}</p>
                                <p className="text-xs text-fg-secondary">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p className="font-semibold mb-1 text-fg">{t('uploadNote.dropHint')}</p>
                                <p className="text-xs text-fg-secondary">
                                    {t('uploadNote.dropTypes')}
                                </p>
                            </div>
                        )}
                    </div>
                    {errors.file && (
                        <p className="text-xs mt-1 flex items-center gap-1 text-danger">
                            <AlertCircle size={12} /> {errors.file}
                        </p>
                    )}
                </Field>

                {canMarkPremium && (
                    <div className="mb-4 p-4 rounded-xl border border-border">
                        <div className="flex items-center gap-3 mb-3">
                            <input
                                type="checkbox"
                                id="premium"
                                checked={form.isPremium}
                                onChange={e => setForm(f => ({ ...f, isPremium: e.target.checked }))}
                                className="w-4 h-4"
                            />
                            <label htmlFor="premium" className="text-sm font-semibold text-fg">{t('uploadNote.markPremium')}</label>
                        </div>
                        {form.isPremium && (
                            <Field label={t('uploadNote.priceLabel')} required error={errors.price} className="mb-0">
                                <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={form.price}
                                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                    placeholder="500"
                                    invalid={!!errors.price}
                                />
                            </Field>
                        )}
                    </div>
                )}

                {uploading && (
                    <div className="mb-4">
                        <div className="flex justify-between text-xs mb-2 text-fg-secondary">
                            <span>{t('uploadNote.uploading')}</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden bg-border">
                            <motion.div
                                className="h-full rounded-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </div>
                )}
            </form>
        </Modal>
    );
}
