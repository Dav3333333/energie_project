import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Input from '@/components/ui/Input';
import { usePurchase } from '../hooks/usePurchases';
import { callables, callableError } from '@/lib/firebase/callables';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLES } from '@/constants/roles';
import { formatCurrency, formatDateTime, formatKwh } from '@/lib/formatters';

export default function PurchaseDetailPage() {
  const { purchaseId } = useParams();
  const { profile } = useAuth();
  const { data: purchase, isLoading } = usePurchase(purchaseId);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  if (isLoading) return <AppShell title="Achat" showBack><LoadingState /></AppShell>;
  if (!purchase) return <AppShell title="Achat" showBack><EmptyState title="Achat introuvable" /></AppShell>;

  const canCancel =
    purchase.status === 'VALID' &&
    [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(profile?.role);

  const onCancel = async () => {
    if (cancelReason.trim().length < 3) {
      toast.error('Motif requis (3 caractères minimum).');
      return;
    }
    setCancelling(true);
    try {
      await callables.cancelEnergyPurchase({ purchaseId, reason: cancelReason.trim() });
      toast.success('Achat annulé.');
      setCancelOpen(false);
      setCancelReason('');
    } catch (err) {
      toast.error(callableError(err).message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AppShell title={`Reçu ${purchase.receiptNumber}`} showBack>
      <PageHeader
        title={`Reçu ${purchase.receiptNumber}`}
        subtitle={formatDateTime(purchase.purchaseDate)}
        actions={<StatusBadge status={purchase.status} />}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Quantité" value={formatKwh(purchase.purchasedKwh)} />
        <StatCard
          label="Montant total"
          value={formatCurrency(purchase.totalAmount, purchase.currency)}
          tone="success"
        />
        <StatCard
          label="Prix / kWh"
          value={formatCurrency(purchase.pricePerKwh, purchase.currency)}
        />
        <StatCard label="Paiement" value={purchase.paymentMethod} />
      </div>

      <dl className="mt-6 space-y-2 text-sm">
        <Row label="N° reçu" value={purchase.receiptNumber} />
        <Row label="Référence paiement" value={purchase.paymentReference || '—'} />
        <Row label="Devise" value={purchase.currency} />
        <Row label="Créé le" value={formatDateTime(purchase.createdAt)} />
        {purchase.cancelledAt && (
          <>
            <Row label="Annulé le" value={formatDateTime(purchase.cancelledAt)} />
            <Row label="Motif" value={purchase.cancellationReason || '—'} />
          </>
        )}
      </dl>

      {canCancel && (
        <div className="mt-6">
          <Button variant="danger" size="lg" onClick={() => setCancelOpen(true)}>
            <XCircle size={18} /> Annuler cet achat
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={onCancel}
        loading={cancelling}
        title="Annuler l'achat"
        message={`L'achat ${purchase.receiptNumber} sera marqué ANNULÉ et le solde de la boutique recalculé. Aucune suppression définitive n'est effectuée.`}
        confirmLabel="Confirmer l'annulation"
      >
        <Input
          label="Motif (obligatoire)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
      </ConfirmDialog>
    </AppShell>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-[var(--c-border)] last:border-0">
      <dt className="text-[var(--c-text-muted)]">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}