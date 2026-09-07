import { cn } from '../../lib/cn';

function Skeleton({ className, ...rest }) {
    return <div className={cn('animate-pulse rounded-md bg-surface-hover', className)} {...rest} />;
}

Skeleton.Text = function SkeletonText({ lines = 3, className }) {
    return (
        <div className={cn('flex flex-col gap-2', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
            ))}
        </div>
    );
};

Skeleton.Circle = function SkeletonCircle({ size = 40, className }) {
    return <Skeleton className={cn('rounded-full shrink-0', className)} style={{ width: size, height: size }} />;
};

export default Skeleton;
