import { useEffect } from 'react';

/**
 * Per-page title, description and canonical URL.
 *
 * Updates the tags already in index.html in place rather than rendering new
 * ones. React 19 will hoist a rendered <meta> into <head>, but it does NOT
 * deduplicate by name the way it does for <title> — so rendering them left two
 * description tags per page, with index.html's generic one appearing first and
 * therefore winning. Upserting by selector keeps exactly one of each.
 *
 * Note on scope: social scrapers (WhatsApp, Twitter, LinkedIn, Facebook) do not
 * execute JavaScript, so they only ever see the static tags in index.html. That
 * file therefore stays the source of truth for the shared-link card, and this
 * component improves the browser tab and what JS-rendering search crawlers see.
 */
const SITE_NAME = 'StudyHub';
const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/+$/, '');

/** Creates the tag if missing, updates it if present. */
function upsert(selector, create, attr, value) {
    if (value == null) return;
    let el = document.head.querySelector(selector);
    if (!el) {
        el = create();
        document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
}

function removeIfPresent(selector) {
    document.head.querySelector(selector)?.remove();
}

export default function Seo({ title, description, path, noindex = false }) {
    // "Page · StudyHub", except on the home page where that would stutter.
    const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
    const canonical = path && SITE_URL ? `${SITE_URL}${path}` : null;

    useEffect(() => {
        document.title = fullTitle;

        upsert('meta[name="description"]',
            () => Object.assign(document.createElement('meta'), { name: 'description' }),
            'content', description);

        upsert('meta[property="og:title"]',
            () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:title'); return m; },
            'content', fullTitle);

        upsert('meta[property="og:description"]',
            () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:description'); return m; },
            'content', description);

        if (canonical) {
            upsert('link[rel="canonical"]',
                () => Object.assign(document.createElement('link'), { rel: 'canonical' }),
                'href', canonical);
            upsert('meta[property="og:url"]',
                () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:url'); return m; },
                'content', canonical);
        }

        // Signed-in areas and error pages carry no search value, and indexing
        // them just fills results with login redirects.
        if (noindex) {
            upsert('meta[name="robots"]',
                () => Object.assign(document.createElement('meta'), { name: 'robots' }),
                'content', 'noindex, follow');
        } else {
            // Clear a noindex left behind by a previously-rendered page —
            // navigating 404 -> home must not leave the home page noindexed.
            removeIfPresent('meta[name="robots"]');
        }
    }, [fullTitle, description, canonical, noindex]);

    return null;
}
