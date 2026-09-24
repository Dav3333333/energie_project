import BottomSheet from '@/components/mobile/BottomSheet';
import Button from '@/components/ui/Button';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirmer',
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'danger',
  loading = false,
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <p className="text-sm mb-6">{message}</p>
      <div className="flex gap-3">
        <Button variant="outline" size="md" className="flex-1" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          size="md"
          className="flex-1"
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </BottomSheet>
  );
}