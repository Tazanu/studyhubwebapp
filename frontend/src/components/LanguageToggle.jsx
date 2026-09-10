import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { LANGUAGES } from '../i18n';
import { cn } from '../lib/cn';

/**
 * Switch between the available languages.
 *
 * A two-language segmented control rather than a dropdown: with only EN and FR
 * a menu costs an extra tap and hides the fact that a choice exists at all,
 * which is exactly what a French speaker landing on an English page needs to
 * spot immediately.
 *
 * The choice persists to localStorage through i18next's detector, so it
 * survives a reload and beats the browser's own language on the next visit.
 */
export default function LanguageToggle({ className, compact = false }) {
    const { i18n, t } = useTranslation();
    const current = i18n.resolvedLanguage;

    return (
        <div
            role="group"
            aria-label={t('nav.language')}
            className={cn('flex items-center gap-0.5 p-0.5 rounded-full border border-border bg-surface', className)}
        >
            {!compact && <Languages size={14} className="ml-1.5 mr-0.5 shrink-0 text-fg-muted" aria-hidden="true" />}
            {LANGUAGES.map(({ code, short, label }) => {
                const active = current === code;
                return (
                    <button
                        key={code}
                        type="button"
                        onClick={() => i18n.changeLanguage(code)}
                        aria-label={label}
                        aria-pressed={active}
                        title={label}
                        className={cn(
                            'px-2 py-1 rounded-full text-xs font-bold transition-colors',
                            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
                            active
                                ? 'bg-primary-solid text-white'
                                : 'text-fg-secondary hover:text-fg',
                        )}
                    >
                        {short}
                    </button>
                );
            })}
        </div>
    );
}
