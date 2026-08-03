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
                        <stop offset="0%" stopColor="#0052cc" />
                        <stop offset="100%" stopColor="#0066ff" />
                    </linearGradient>
                </defs>

                {/* Rounded square background */}
                <rect width="40" height="40" rx="10" fill="url(#sh-grad)" />

                {/* Open book — left page */}
                <path
                    d="M20 27 C20 27 13 24.5 10 25.5 L10 14 C13 13 20 15.5 20 15.5"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity="0.95"
                />
                {/* Open book — right page */}
                <path
                    d="M20 27 C20 27 27 24.5 30 25.5 L30 14 C27 13 20 15.5 20 15.5"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity="0.95"
                />
                {/* Spine */}
                <line x1="20" y1="15.5" x2="20" y2="27" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.95" />
            </svg>

            {showText && (
                <span
                    className={`font-bold ${text} leading-none`}
                    style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        background: 'linear-gradient(135deg, #0052cc 0%, #0066ff 100%)',
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
