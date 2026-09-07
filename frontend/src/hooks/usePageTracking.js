import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalytics, trackPageview } from '../lib/analytics';

/**
 * Reports a pageview on every route change.
 *
 * Needed because React Router swaps the view without a real navigation, so an
 * auto-tracking analytics snippet would record only the first URL of a session.
 */
export default function usePageTracking() {
    const { pathname, search } = useLocation();

    useEffect(() => {
        initAnalytics();
    }, []);

    useEffect(() => {
        trackPageview(window.location.origin + pathname + search);
    }, [pathname, search]);
}
