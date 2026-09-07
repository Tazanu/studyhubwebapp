import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

const Textarea = forwardRef(function Textarea({ invalid = false, rows = 4, className, ...rest }, ref) {
    return (
        <textarea
            ref={ref}
            rows={rows}
            aria-invalid={invalid || undefined}
            className={cn(
                'w-full px-4 py-3 rounded-sm border-2 bg-input text-fg text-sm transition-colors resize-y',
                'placeholder:text-fg-muted focus:outline-none',
                invalid ? 'border-danger focus:border-danger' : 'border-border focus:border-primary',
                className,
            )}
            {...rest}
        />
    );
});

export default Textarea;
