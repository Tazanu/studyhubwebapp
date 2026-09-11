import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

const SIZES = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
};

export default function Modal({
    open,
    onClose,
    title,
    size = 'md',
    closeOnBackdrop = true,
    closeOnEscape = true,
    initialFocusRef,
    footer,
    children,
    className,
}) {
    const { t } = useTranslation();
    const panelRef = useRef(null);

    useEffect(() => {
        if (!open || !closeOnEscape) return;
        const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, closeOnEscape, onClose]);

    useEffect(() => {
        if (!open) return;
        (initialFocusRef?.current || panelRef.current)?.focus();
    }, [open, initialFocusRef]);

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onMouseDown={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose?.(); }}
                >
                    <motion.div
                        ref={panelRef}
                        tabIndex={-1}
                        role="dialog"
                        aria-modal="true"
                        aria-label={typeof title === 'string' ? title : undefined}
                        className={cn(
                            'w-full max-h-[90vh] flex flex-col rounded-2xl border border-border bg-surface-raised shadow-lg outline-none',
                            SIZES[size] ?? SIZES.md,
                            className,
                        )}
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                            {title ? (
                                <h2 className="text-lg font-bold text-fg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    {title}
                                </h2>
                            ) : <span />}
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label={t('common.close')}
                                className="p-1.5 rounded-lg text-fg-secondary hover:bg-surface-hover hover:text-fg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="px-6 py-5 overflow-y-auto grow">
                            {children}
                        </div>
                        {footer && (
                            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 shrink-0">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
