import i18n from '../i18n';

/**
 * Dates in the reader's language.
 *
 * These were pinned to 'en-US' / 'en-GB', which meant a French reader got
 * "Mon, Sep 8" next to otherwise French copy. Reading `i18n.language` at call
 * time rather than caching it means a language switch takes effect on the next
 * render, with no reload.
 *
 * Falls back to the browser's own locale if i18n has not initialised yet —
 * `undefined` is what Intl treats as "use the default".
 */
function activeLocale() {
    return i18n.resolvedLanguage || i18n.language || undefined;
}

export function formatDate(value, options) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(activeLocale(), options);
}

export function formatTime(value, options) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(activeLocale(), options);
}

/** Thousands separators in the reader's convention: 1,500 vs 1 500. */
export function formatNumber(value, options) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    return n.toLocaleString(activeLocale(), options);
}
