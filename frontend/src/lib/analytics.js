/**
 * Plausible analytics — loaded only when VITE_PLAUSIBLE_DOMAIN is set, so a
 * local or unconfigured build ships no third-party script at all.
 *
 * Plausible is cookieless and stores nothing on the device, which is why it can
 * load without a consent gate (see CookieNotice.jsx). Swapping in a
 * cookie-setting provider would mean gating this behind real consent.
 */
const DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
const SCRIPT_ID = 'plausible-analytics';

export const analyticsEnabled = Boolean(DOMAIN);

/** Injects the script once. Safe to call repeatedly. */
export function initAnalytics() {
    if (!analyticsEnabled) return;
    if (typeof document === 'undefined') return;
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.defer = true;
    script.dataset.domain = DOMAIN;
    // The `manual` variant does not auto-track pageviews. We drive them from
    // the router instead, because this is a single-page app: after the first
    // load React Router changes the URL without a navigation event, so
    // automatic tracking would only ever record the landing page.
    script.src = 'https://plausible.io/js/script.manual.js';
    document.head.appendChild(script);

    // Plausible's snippet expects this queue to exist before the script lands,
    // so calls made during startup are replayed rather than dropped.
    window.plausible = window.plausible || function (...args) {
        (window.plausible.q = window.plausible.q || []).push(args);
    };
}

/** Records a pageview for the current URL. */
export function trackPageview(url) {
    if (!analyticsEnabled) return;
    window.plausible?.('pageview', url ? { u: url } : undefined);
}

/**
 * Records a custom event, e.g. trackEvent('Signup') — the goal names configured
 * in the Plausible dashboard. No-ops when analytics is disabled, so call sites
 * never need to guard.
 */
export function trackEvent(name, props) {
    if (!analyticsEnabled) return;
    window.plausible?.(name, props ? { props } : undefined);
}
