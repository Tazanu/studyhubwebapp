import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Banner from './ui/Banner';

export default function InstallPrompt() {
    const { t } = useTranslation();
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [dismissed, setDismissed] = useState(() => {
        return localStorage.getItem('pwa-install-dismissed') === 'true';
    });

    useEffect(() => {
        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        if (isStandalone) return;

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!dismissed) {
                setShowPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [dismissed]);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowPrompt(false);
        }

        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        setDismissed(true);
        localStorage.setItem('pwa-install-dismissed', 'true');
    };

    return (
        <AnimatePresence>
            {showPrompt && deferredPrompt && (
                <Banner
                    tone="primary"
                    icon={Download}
                    title={t('app.installTitle')}
                    description={t('app.installBody')}
                    position="bottom"
                    dismissible
                    onDismiss={handleDismiss}
                    action={{ label: t('app.install'), onClick: handleInstall }}
                />
            )}
        </AnimatePresence>
    );
}
