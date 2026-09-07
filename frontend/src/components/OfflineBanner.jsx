import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function OfflineBanner() {
    const isOnline = useOnlineStatus();

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="fixed top-0 left-0 right-0 z-50 px-4 pt-4"
                >
                    <div className="mx-auto max-w-2xl rounded-xl px-4 py-3 border shadow-xl flex items-center gap-3 bg-danger border-danger/30 backdrop-blur-md">
                        <WifiOff size={18} className="text-white" strokeWidth={2} />
                        <p className="text-sm font-semibold text-white flex-1">
                            You're offline. Some features won't work until you reconnect.
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
