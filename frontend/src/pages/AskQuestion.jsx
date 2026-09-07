import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, MicOff, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiError } from '../api/client';
import Sidebar from '../components/Sidebar';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

const CATEGORIES = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Engineering', 'Medicine', 'Business', 'Other'];

export default function AskQuestion() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState('');
    const [tags, setTags] = useState('');
    const [images, setImages] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const { recording, audioBlob, audioURL, startRecording, stopRecording, resetRecording } = useAudioRecorder();
    const imageInputRef = useRef(null);

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        if (images.length + files.length > 5) {
            toast.error('Maximum 5 images allowed');
            return;
        }
        setImages([...images, ...files]);
    };

    const removeImage = (index) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim() || !content.trim() || !subject) {
            toast.error('Title, content, and subject are required');
            return;
        }

        setSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('title', title.trim());
            formData.append('content', content.trim());
            formData.append('subject', subject);
            if (category) formData.append('category', category);
            if (tags) formData.append('tags', JSON.stringify(tags.split(',').map(t => t.trim()).filter(Boolean)));

            if (audioBlob) {
                formData.append('audio', audioBlob, 'question-audio.webm');
            }

            images.forEach(image => {
                formData.append('images', image);
            });

            const { data } = await api.post('/qa', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('Question posted successfully!');
            navigate(`/qa/${data.question.id}`);
        } catch (error) {
            console.error('Submit error:', error);
            toast.error(apiError(error, 'Failed to post question'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="lg:pl-60 min-h-screen bg-bg text-fg">
            <Sidebar />
            <div className="min-h-screen" style={{ paddingTop: '80px' }}>
                <div className="max-w-4xl mx-auto px-6 py-8">

                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/qa')}
                        className="p-2 rounded-lg transition-colors text-fg-secondary hover:bg-primary-solid hover:text-white"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Ask a Question
                        </h1>
                        <p className="text-sm mt-1 text-fg-secondary">
                            Get help from the community
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    <Field label="Title" required>
                        <Input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What's your question? Be specific."
                            required
                        />
                    </Field>

                    <Field label="Description" required>
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Provide all the details someone would need to answer your question..."
                            rows={8}
                            required
                        />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Subject" required>
                            <Input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="e.g., Calculus"
                                required
                            />
                        </Field>
                        <Field label="Category">
                            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                                <option value="">Select category</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </Select>
                        </Field>
                    </div>

                    <Field label="Tags">
                        <Input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="e.g., derivatives, limits, integration (comma-separated)"
                        />
                    </Field>

                    <div className="p-4 rounded-lg border border-border bg-surface">
                        <label className="block text-sm font-semibold mb-3 text-fg">Audio Explanation (Optional)</label>
                        <div className="flex items-center gap-3">
                            {!audioURL ? (
                                <Button
                                    type="button"
                                    onClick={recording ? stopRecording : startRecording}
                                    icon={recording ? MicOff : Mic}
                                    variant={recording ? 'danger' : 'primary'}
                                    className={recording ? 'animate-pulse' : ''}
                                >
                                    {recording ? 'Stop Recording' : 'Start Recording'}
                                </Button>
                            ) : (
                                <div className="flex items-center gap-3 flex-1">
                                    <audio src={audioURL} controls className="flex-1" />
                                    <button
                                        type="button"
                                        onClick={resetRecording}
                                        className="p-2 rounded-lg text-fg-secondary hover:bg-danger hover:text-white transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 rounded-lg border border-border bg-surface">
                        <label className="block text-sm font-semibold mb-3 text-fg">Images (Optional, max 5)</label>
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageSelect}
                            className="hidden"
                        />
                        <Button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={images.length >= 5}
                            variant="secondary"
                            icon={ImageIcon}
                        >
                            Add Images
                        </Button>

                        {images.length > 0 && (
                            <div className="grid grid-cols-3 gap-3 mt-3">
                                {images.map((image, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={URL.createObjectURL(image)}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-24 object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 p-1 rounded-full bg-danger text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={submitting} loading={submitting} size="lg" className="hover:-translate-y-0.5">
                            {submitting ? 'Posting...' : 'Post Question'}
                        </Button>
                        <Button type="button" onClick={() => navigate('/qa')} variant="secondary" size="lg">
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        </div>
        </div>
    );
}
