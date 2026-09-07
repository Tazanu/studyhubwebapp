import { Star } from 'lucide-react';
import { cn } from '../../lib/cn';

export default function StarRating({ value = 0, max = 5, size = 16, onChange, readOnly = true, showValue = false, className }) {
    const stars = Array.from({ length: max }, (_, i) => i + 1);
    const Tag = readOnly ? 'span' : 'button';

    return (
        <div className={cn('inline-flex items-center gap-1.5', className)}>
            <div className="inline-flex items-center gap-0.5">
                {stars.map((n) => {
                    const fillPct = Math.max(0, Math.min(1, value - (n - 1))) * 100;
                    return (
                        <Tag
                            key={n}
                            type={readOnly ? undefined : 'button'}
                            onClick={readOnly ? undefined : () => onChange?.(n)}
                            aria-label={readOnly ? undefined : `Rate ${n} out of ${max}`}
                            className={cn('relative inline-block', !readOnly && 'cursor-pointer')}
                            style={{ width: size, height: size }}
                        >
                            <Star size={size} className="text-border-strong" fill="none" />
                            <span className="absolute inset-0 top-0 left-0 overflow-hidden" style={{ width: `${fillPct}%` }}>
                                <Star size={size} className="text-warning" fill="currentColor" />
                            </span>
                        </Tag>
                    );
                })}
            </div>
            {showValue && <span className="text-xs font-semibold text-fg-secondary">{value.toFixed(1)}</span>}
        </div>
    );
}
