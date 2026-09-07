import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

export default function Stepper({ steps, current, className }) {
    return (
        <div className={cn('flex items-center', className)}>
            {steps.map((label, i) => {
                const stepNum = i + 1;
                const completed = stepNum < current;
                const active = stepNum === current;
                return (
                    <div key={label} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-2">
                            <div
                                className={cn(
                                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors shrink-0',
                                    completed && 'bg-primary-solid border-primary text-primary-contrast',
                                    active && !completed && 'border-primary text-primary',
                                    !completed && !active && 'border-border text-fg-muted',
                                )}
                            >
                                {completed ? <Check size={16} /> : stepNum}
                            </div>
                            <span className={cn('text-xs font-medium whitespace-nowrap', active || completed ? 'text-fg' : 'text-fg-muted')}>
                                {label}
                            </span>
                        </div>
                        {stepNum < steps.length && (
                            <div className={cn('h-0.5 flex-1 mx-2 mb-5 transition-colors', completed ? 'bg-primary' : 'bg-border')} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
