import { useState, useRef } from 'react';
import { Camera } from 'lucide-react';
import { getAvatarColor } from '../../data/normalizeTutor';
import api from '../../api/client';
import { toast } from 'sonner';
import { mediaUrl } from '../../lib/mediaUrl';


export default function TutorAvatar({ src, name, tutorId, size = 64, rounded = 'rounded-xl', isOwn = false, onUpload, className = '' }) {
    const [imgKey, setImgKey] = useState(0);
    const [hovered, setHovered] = useState(false);
    const fileRef = useRef(null);

    const initials = (name || '?')
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const bg = getAvatarColor(tutorId);
    const imgSrc = mediaUrl(src);

    const handleFile = async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('profile_picture', file);
        try {
            const { data } = await api.patch('/users/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            onUpload?.(data.user);
            setImgKey(k => k + 1);
            toast.success('Profile photo updated!');
        } catch { toast.error('Upload failed'); }
    };

    return (
        <div
            className={`relative shrink-0 ${rounded} overflow-hidden ${className}`}
            style={{ width: size, height: size, cursor: isOwn ? 'pointer' : 'default' }}
            onMouseEnter={() => isOwn && setHovered(true)}
            onMouseLeave={() => isOwn && setHovered(false)}
            onClick={() => isOwn && fileRef.current?.click()}
        >
            {imgSrc ? (
                <img
                    key={imgKey}
                    src={imgSrc}
                    alt={name}
                    className={`w-full h-full object-cover ${rounded}`}
                />
            ) : (
                <div
                    className={`w-full h-full flex items-center justify-center font-bold text-white ${rounded}`}
                    style={{ background: bg, fontSize: size * 0.32 }}
                >
                    {initials}
                </div>
            )}

            {isOwn && hovered && (
                <div
                    className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 ${rounded}`}
                >
                    <Camera size={size * 0.28} color="white" />
                    <span className="text-white font-semibold" style={{ fontSize: Math.max(size * 0.13, 10) }}>Change</span>
                </div>
            )}

            {isOwn && (
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFile}
                />
            )}
        </div>
    );
}
