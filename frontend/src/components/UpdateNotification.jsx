import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Banner from './ui/Banner';

export default function UpdateNotification({ updateSW, offlineReady, needRefresh, setNeedRefresh, setOfflineReady }) {
    const { t } = useTranslation();
    const [dismissed, setDismissed] = useState(false);

    // Show offline-ready toast briefly, then auto-dismiss
    useEffect(() => {
        if (offlineReady && !dismissed) {
            const timer = setTimeout(() => {
                setOfflineReady(false);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [offlineReady, dismissed, setOfflineReady]);

    const handleDismiss = () => {
        setDismissed(true);
        setNeedRefresh(false);
    };

    return (
        <AnimatePresence>
            {needRefresh && !dismissed && (
                <Banner
                    key="update"
                    tone="info"
                    icon={RefreshCw}
                    title={t('app.updateTitle')}
                    description={t('app.updateBody')}
                    position="top"
                    dismissible
                    onDismiss={handleDismiss}
                    action={{ label: t('app.refresh'), onClick: () => updateSW(true) }}
                />
            )}

            {offlineReady && !dismissed && (
                <Banner
                    key="offline-ready"
                    tone="success"
                    icon={CheckCircle2}
                    title={t('app.readyTitle')}
                    description={t('app.readyBody')}
                    position="top"
                    dismissible
                    onDismiss={() => setDismissed(true)}
                />
            )}
        </AnimatePresence>
    );
}
