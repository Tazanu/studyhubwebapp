export default function Field({ label, htmlFor, error, hint, required, className, children }) {
    return (
        <div className={className ?? 'mb-5'}>
            {label && (
                <label htmlFor={htmlFor} className="block font-semibold text-sm mb-1.5 text-fg">
                    {label}
                    {required && <span className="text-danger ml-0.5">*</span>}
                </label>
            )}
            {children}
            {hint && !error && <p className="text-xs mt-1.5 text-fg-muted">{hint}</p>}
            {error && (
                <p role="alert" className="text-xs mt-1.5 text-danger">
                    {error}
                </p>
            )}
        </div>
    );
}
