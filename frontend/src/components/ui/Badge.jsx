import { cn } from '../../lib/cn';

const TONE_CLASSES = {
    neutral: 'bg-surface-hover text-fg-secondary',
    primary: 'bg-primary-subtle text-primary',
    success: 'bg-success-bg text-success',
    warning: 'bg-warning-bg text-warning',
    danger:  'bg-danger-bg text-danger',
    info:    'bg-info-bg text-info',
    premium: 'bg-premium-bg text-premium',
};

const SIZE_CLASSES = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
};

export default function Badge({ tone = 'neutral', size = 'md', icon: Icon, className, children }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full font-semibold whitespace-nowrap',
                TONE_CLASSES[tone] ?? TONE_CLASSES.neutral,
                SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
                className,
            )}
        >
            {Icon && <Icon size={size === 'sm' ? 11 : 13} />}
            {children}
        </span>
    );
}
