import { cn } from '../../lib/cn';

export default function EmptyState({ icon: Icon, title, description, action, className }) {
    return (
        <div className={cn('flex flex-col items-center justify-center text-center py-16 px-6', className)}>
            {Icon && (
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-surface-hover text-fg-muted">
                    <Icon size={26} strokeWidth={1.5} />
                </div>
            )}
            {title && <h3 className="text-base font-bold mb-1.5 text-fg">{title}</h3>}
            {description && <p className="text-sm max-w-sm mb-5 text-fg-secondary">{description}</p>}
            {action}
        </div>
    );
}
