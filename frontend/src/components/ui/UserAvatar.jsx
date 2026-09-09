import { useState } from 'react';
import { mediaUrl } from '../../lib/mediaUrl';
import { cn } from '../../lib/cn';

/**
 * A person's avatar: their photo when they have one, their initials when not.
 *
 * Most avatars in the app rendered initials unconditionally and never looked at
 * profile_picture, so uploading a photo appeared to do nothing outside the
 * profile page. This is the single place that decision lives now.
 *
 * Falls back to initials if the image fails to load, rather than leaving a
 * broken-image icon — a slow or unreachable CDN should degrade to something
 * that still looks deliberate.
 */
export default function UserAvatar({
    src,
    firstName = '',
    lastName = '',
    name,
    size = 40,
    className,
    rounded = 'rounded-full',
}) {
    const [failed, setFailed] = useState(false);

    const label = name || `${firstName} ${lastName}`.trim();
    const initials = (label || '?')
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '?';

    const url = failed ? null : mediaUrl(src);

    if (url) {
        return (
            <img
                src={url}
                alt={label || 'Profile photo'}
                onError={() => setFailed(true)}
                loading="lazy"
                width={size}
                height={size}
                style={{ width: size, height: size }}
                className={cn(rounded, 'object-cover shrink-0', className)}
            />
        );
    }

    return (
        <div
            aria-hidden={!label}
            style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
            className={cn(
                rounded,
                'shrink-0 flex items-center justify-center font-bold text-white',
                'bg-[image:var(--gradient-primary)]',
                className,
            )}
        >
            {initials}
        </div>
    );
}
