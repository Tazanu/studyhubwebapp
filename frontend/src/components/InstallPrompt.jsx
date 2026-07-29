import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function InstallPrompt() {
    const { theme } = useTheme();
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
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="fixed bottom-6 z-50 w-full max-w-sm px-4"
                    style={{ left: '50%', transform: 'translateX(-50%)' }}
                >
                    <div
                        className="rounded-xl p-4 border shadow-2xl flex items-center gap-3"
                        style={{
                            background: theme === 'dark' ? 'rgba(20,20,20,0.98)' : 'rgba(255,255,255,0.98)',
                            borderColor: 'var(--accent-blue)',
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'linear-gradient(135deg, #0052cc, #0066ff)' }}
                        >
                            <Download size={20} color="white" strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>
                                Install StudyHub
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                Quick access from your home screen
                            </p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleInstall}
                            className="px-4 py-2 rounded-lg font-semibold text-white text-xs shrink-0"
                            style={{ background: 'linear-gradient(135deg, #0052cc, #0066ff)' }}
                        >
                            Install
                        </motion.button>
                        <button
                            onClick={handleDismiss}
                            className="p-1.5 rounded-lg transition-colors hover:bg-gray-500 hover:text-white shrink-0"
                            style={{ color: 'var(--text-secondary)' }}
                            aria-label="Dismiss"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
