import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import Button from './Button';

const TONE_ICON_CLASSES = {
    info: 'text-info bg-info-bg',
    success: 'text-success bg-success-bg',
    warning: 'text-warning bg-warning-bg',
    danger: 'text-danger bg-danger-bg',
    primary: 'text-white bg-[image:var(--gradient-primary)]',
};

export default function Banner({
    tone = 'info',
    icon: Icon,
    title,
    description,
    dismissible = false,
    onDismiss,
    action,
    position = 'bottom',
    className,
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: position === 'bottom' ? 24 : -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === 'bottom' ? 24 : -24 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            role="status"
            className={cn(
                'fixed left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 rounded-2xl border border-border bg-surface-raised shadow-lg p-4 flex gap-3',
                position === 'bottom' ? 'bottom-4 sm:bottom-6' : 'top-20 sm:top-24',
                className,
            )}
        >
            {Icon && (
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', TONE_ICON_CLASSES[tone] ?? TONE_ICON_CLASSES.info)}>
                    <Icon size={18} />
                </div>
            )}
            <div className="min-w-0 flex-1">
                {title && <p className="text-sm font-bold text-fg">{title}</p>}
                {description && <p className="text-xs mt-0.5 text-fg-secondary">{description}</p>}
                {action && (
                    <div className="mt-3">
                        <Button size="sm" variant="primary" onClick={action.onClick}>
                            {action.label}
                        </Button>
                    </div>
                )}
            </div>
            {dismissible && (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss"
                    className="p-1 rounded-lg text-fg-muted hover:bg-surface-hover hover:text-fg transition-colors shrink-0 h-fit"
                >
                    <X size={16} />
                </button>
            )}
        </motion.div>
    );
}
