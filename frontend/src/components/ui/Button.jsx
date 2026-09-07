import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const VARIANTS = {
    primary:   'text-white bg-[image:var(--gradient-primary)] border border-transparent shadow-sm hover:brightness-110 active:brightness-95',
    secondary: 'bg-surface text-fg border border-border hover:bg-surface-hover',
    outline:   'bg-transparent text-primary border-2 border-primary hover:bg-primary-solid hover:text-primary-contrast',
    ghost:     'bg-transparent text-fg-secondary border border-transparent hover:bg-surface-hover hover:text-fg',
    danger:    'text-white bg-danger border border-transparent hover:brightness-110',
    // solid white — for use on top of a colored/gradient section (e.g. a CTA banner)
    inverse:   'text-primary bg-white border border-transparent shadow-sm hover:bg-white/90',
};

const SIZES = {
    sm: 'h-9 px-3 text-xs gap-1.5 rounded-md',
    md: 'h-11 px-5 text-sm gap-2 rounded-md',
    lg: 'h-12 px-6 text-base gap-2.5 rounded-md',
};

const ICON_SIZES = { sm: 14, md: 16, lg: 18 };

const Button = forwardRef(function Button(
    {
        variant = 'primary',
        size = 'md',
        icon: Icon,
        iconPosition = 'left',
        loading = false,
        fullWidth = false,
        disabled = false,
        to,
        href,
        className,
        children,
        ...rest
    },
    ref
) {
    const iconSize = ICON_SIZES[size] ?? ICON_SIZES.md;
    const classes = cn(
        'inline-flex items-center justify-center font-semibold transition-all whitespace-nowrap',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        fullWidth && 'w-full',
        className,
    );

    const content = (
        <>
            {loading ? (
                <Loader2 size={iconSize} className="animate-spin" />
            ) : (
                Icon && iconPosition === 'left' && <Icon size={iconSize} />
            )}
            {children}
            {!loading && Icon && iconPosition === 'right' && <Icon size={iconSize} />}
        </>
    );

    if (to) {
        return (
            <Link ref={ref} to={to} className={classes} {...rest}>
                {content}
            </Link>
        );
    }

    if (href) {
        return (
            <a ref={ref} href={href} className={classes} {...rest}>
                {content}
            </a>
        );
    }

    return (
        <button ref={ref} type={rest.type ?? 'button'} className={classes} disabled={disabled || loading} {...rest}>
            {content}
        </button>
    );
});

export default Button;
