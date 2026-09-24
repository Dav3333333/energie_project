import { useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import { useInvoice } from '../hooks/useInvoices';
import { formatCurrency, formatDate, formatKwh } from '@/lib/formatters';

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const { data: invoice, isLoading } = useInvoice(invoiceId);

  if (isLoading) return <AppShell title="Facture" showBack><LoadingState /></AppShell>;
  if (!invoice) return <AppShell title="Facture" showBack><EmptyState title="Facture introuvable" /></AppShell>;

  const downloadPdf = () => {
    if (!invoice.pdfUrl) return;
    window.open(invoice.pdfUrl, '_blank', 'noopener');
  };

  return (
    <AppShell title={`Facture ${invoice.invoiceNumber}`} showBack>
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`${formatDate(invoice.periodStart)} → ${formatDate(invoice.periodEnd)}`}
        actions={<StatusBadge status={invoice.status} />}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Consommé" value={formatKwh(invoice.consumedKwh)} />
        <StatCard
          label="Montant consommé"
          value={formatCurrency(invoice.consumedAmount, invoice.currency)}
          tone="danger"
        />
        <StatCard label="Acheté (période)" value={formatKwh(invoice.purchasedKwh)} />
        <StatCard
          label="Solde restant"
          value={formatCurrency(invoice.remainingAmount, invoice.currency)}
          tone="success"
        />
      </div>

      <dl className="mt-6 space-y-2 text-sm">
        <Row label="Type" value={invoice.type === 'INVOICE' ? 'Facture' : 'Relevé'} />
        <Row label="Index ouverture" value={invoice.openingMeterKwh != null ? `${invoice.openingMeterKwh} kWh` : '—'} />
        <Row label="Index fermeture" value={invoice.closingMeterKwh != null ? `${invoice.closingMeterKwh} kWh` : '—'} />
        <Row label="Prix / kWh" value={formatCurrency(invoice.pricePerKwh, invoice.currency)} />
        <Row label="Crédit restant (kWh)" value={`${invoice.remainingKwh} kWh`} />
      </dl>

      {invoice.pdfUrl && (
        <div className="mt-6">
          <Button size="lg" onClick={downloadPdf}>
            <Download size={18} /> Télécharger le PDF
          </Button>
        </div>
      )}
    </AppShell>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-[var(--c-border)] last:border-0 gap-3">
      <dt className="text-[var(--c-text-muted)]">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}