import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

const Input = forwardRef(function Input({ invalid = false, className, ...rest }, ref) {
    return (
        <input
            ref={ref}
            aria-invalid={invalid || undefined}
            className={cn(
                'w-full h-11 px-4 rounded-sm border-2 bg-input text-fg text-sm transition-colors',
                'placeholder:text-fg-muted focus:outline-none',
                invalid ? 'border-danger focus:border-danger' : 'border-border focus:border-primary',
                className,
            )}
            {...rest}
        />
    );
});

export default Input;
