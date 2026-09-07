export default function StudyHubLogo({ size = 'md', showText = true, className = '' }) {
    const sizes = {
        sm: { icon: 26, text: 'text-base' },
        md: { icon: 32, text: 'text-xl'   },
        lg: { icon: 40, text: 'text-2xl'  },
        xl: { icon: 56, text: 'text-4xl'  },
    };

    const { icon, text } = sizes[size] || sizes.md;

    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            <svg
                width={icon}
                height={icon}
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id="sh-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#1d4ed8" />
                        <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                </defs>

                {/* Rounded square background */}
                <rect width="40" height="40" rx="10" fill="url(#sh-grad)" />

                {/* Hub-and-node mark — center node connected to three satellites */}
                <g stroke="white" strokeWidth="1.4" strokeLinecap="round">
                    <line x1="20" y1="20" x2="20" y2="9.8" />
                    <line x1="20" y1="20" x2="11.2" y2="25.1" />
                    <line x1="20" y1="20" x2="28.8" y2="25.1" />
                </g>
                <circle cx="20" cy="9.8" r="2.6" fill="white" />
                <circle cx="11.2" cy="25.1" r="2.6" fill="white" />
                <circle cx="28.8" cy="25.1" r="2.6" fill="white" />
                <circle cx="20" cy="20" r="3.6" fill="white" />
            </svg>

            {showText && (
                <span
                    className={`font-bold ${text} leading-none`}
                    style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        letterSpacing: '-0.03em',
                    }}
                >
                    StudyHub
                </span>
            )}
        </div>
    );
}
