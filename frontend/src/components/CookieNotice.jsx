import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Cookie } from 'lucide-react';
import Button from './ui/Button';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'cookie-notice';

/**
 * A notice, deliberately not a consent gate.
 *
 * StudyHub sets no advertising cookies and its analytics (Plausible) is
 * cookieless — it stores nothing on the device and collects no personal data,
 * so under the GDPR/ePrivacy Directive there is no consent to obtain. Showing
 * an "Accept / Reject" dialog here would be theatre: both buttons would do the
 * same thing, which is worse than saying plainly what is stored.
 *
 * What we DO store (the auth token, the theme choice) is strictly necessary or
 * user-requested, and is exempt for the same reason. If a tracking cookie is
 * ever added, this must become a real gate that blocks the script until the
 * visitor opts in.
 */
export default function CookieNotice() {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Reading storage can throw outright when the browser is set to block
        // site data, so a failure here must not take the page down with it.
        let seen;
        try {
            seen = localStorage.getItem(STORAGE_KEY) === 'seen';
        } catch {
            // Can't read, so we also can't persist a dismissal — showing the
            // notice on every load would be obnoxious. Stay quiet instead.
            seen = true;
        }
        if (!seen) {
            // Let the page paint and settle first; appearing mid-load competes
            // with the content the visitor actually came for.
            const timer = setTimeout(() => setVisible(true), 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const dismiss = () => {
        try {
            localStorage.setItem(STORAGE_KEY, 'seen');
        } catch {
            // Private mode or blocked storage — the notice simply returns next
            // visit. Nothing else depends on this.
        }
        setVisible(false);
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    role="region"
                    aria-label={t('cookies.noticeTitle')}
                    className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-50 rounded-2xl border border-border bg-surface-raised shadow-lg p-4 flex gap-3"
                >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-primary-subtle">
                        <Cookie size={18} className="text-primary" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-fg">{t('cookies.noticeTitle')}</p>
                        <p className="text-xs mt-1 leading-relaxed text-fg-secondary">
                            {t('cookies.noticeBody')}{' '}
                            <Link
                                to="/cookies"
                                className="font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary rounded"
                            >
                                {t('cookies.readDetails')}
                            </Link>
                        </p>
                        <div className="mt-3">
                            <Button size="sm" onClick={dismiss} autoFocus>
                                {t('cookies.gotIt')}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
