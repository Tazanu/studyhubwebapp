import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { onServerWaking } from '../api/client';

/**
 * Explains the wait when the API is being retried after a transport failure.
 *
 * The backend sleeps after a period of inactivity, so the first visitor after a
 * quiet spell waits ~30-50s while it boots. Without this the page just sits
 * there and people assume it is broken — which, for a link shared into a chat
 * group, means most of them never come back.
 */
export default function ServerWakingBanner() {
    const [waking, setWaking] = useState(false);

    useEffect(() => onServerWaking(setWaking), []);

    return (
        <AnimatePresence>
            {waking && (
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    role="status"
                    aria-live="polite"
                    className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-border bg-surface-raised shadow-lg"
                >
                    <Loader2 size={15} className="animate-spin text-primary shrink-0" />
                    <span className="text-xs font-medium text-fg whitespace-nowrap">
                        Waking the server &mdash; this can take up to a minute
                    </span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
