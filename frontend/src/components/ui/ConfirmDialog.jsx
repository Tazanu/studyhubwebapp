import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
    open,
    onCancel,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'primary',
    loading = false,
}) {
    return (
        <Modal
            open={open}
            onClose={onCancel}
            title={title}
            size="sm"
            footer={
                <>
                    <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={tone === 'danger' ? 'danger' : 'primary'}
                        size="sm"
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            {description && <p className="text-sm text-fg-secondary">{description}</p>}
        </Modal>
    );
}
