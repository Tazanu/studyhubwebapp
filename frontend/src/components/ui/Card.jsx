import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

const PADDING = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

export default function Card({ as: Comp = 'div', to, padding = 'md', hoverable = false, className, children, ...rest }) {
    const classes = cn(
        'rounded-2xl border border-border bg-surface',
        PADDING[padding] ?? PADDING.md,
        hoverable && 'transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-border-strong',
        className,
    );

    if (to) {
        return (
            <Link to={to} className={classes} {...rest}>
                {children}
            </Link>
        );
    }

    return (
        <Comp className={classes} {...rest}>
            {children}
        </Comp>
    );
}
