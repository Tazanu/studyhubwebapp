import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import Banner from './ui/Banner';

export default function UpdateNotification({ updateSW, offlineReady, needRefresh, setNeedRefresh, setOfflineReady }) {
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
                    title="New version available"
                    description="Refresh to update StudyHub"
                    position="top"
                    dismissible
                    onDismiss={handleDismiss}
                    action={{ label: 'Refresh', onClick: () => updateSW(true) }}
                />
            )}

            {offlineReady && !dismissed && (
                <Banner
                    key="offline-ready"
                    tone="success"
                    icon={CheckCircle2}
                    title="StudyHub is ready"
                    description="App works offline now"
                    position="top"
                    dismissible
                    onDismiss={() => setDismissed(true)}
                />
            )}
        </AnimatePresence>
    );
}
