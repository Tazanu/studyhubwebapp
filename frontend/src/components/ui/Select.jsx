import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

const Select = forwardRef(function Select({ invalid = false, className, children, ...rest }, ref) {
    return (
        <div className="relative">
            <select
                ref={ref}
                aria-invalid={invalid || undefined}
                className={cn(
                    'w-full h-11 pl-4 pr-10 rounded-sm border-2 bg-input text-fg text-sm transition-colors appearance-none',
                    'focus:outline-none',
                    invalid ? 'border-danger focus:border-danger' : 'border-border focus:border-primary',
                    className,
                )}
                {...rest}
            >
                {children}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-muted" />
        </div>
    );
});

export default Select;
