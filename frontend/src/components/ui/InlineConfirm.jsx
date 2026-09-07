import { AnimatePresence, motion } from 'framer-motion';
import Button from './Button';

export default function InlineConfirm({
    active,
    trigger,
    onConfirm,
    onCancel,
    confirmLabel = 'Yes',
    cancelLabel = 'Cancel',
    tone = 'danger',
}) {
    return (
        <AnimatePresence mode="wait" initial={false}>
            {active ? (
                <motion.div
                    key="confirm"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="inline-flex items-center gap-2"
                >
                    <Button variant={tone === 'danger' ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                </motion.div>
            ) : (
                <motion.div
                    key="trigger"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                >
                    {trigger}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
