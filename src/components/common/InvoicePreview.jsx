import { formatCurrency, formatDate, formatKwh } from '@/lib/formatters';

export default function InvoicePreview({ invoice }) {
  if (!invoice) return null;
  return (
    <div className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-4">
      <header className="flex justify-between mb-4">
        <div>
          <p className="text-xs text-[var(--c-text-muted)]">Facture</p>
          <p className="font-bold">{invoice.invoiceNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--c-text-muted)]">Période</p>
          <p className="text-sm font-medium">
            {formatDate(invoice.periodStart)} → {formatDate(invoice.periodEnd)}
          </p>
        </div>
      </header>
      <dl className="text-sm space-y-1">
        <Row label="Consommé" value={formatKwh(invoice.consumedKwh)} />
        <Row label="Prix / kWh" value={formatCurrency(invoice.pricePerKwh, invoice.currency)} />
        <Row
          label="Montant consommé"
          value={formatCurrency(invoice.consumedAmount, invoice.currency)}
        />
        <Row
          label="Solde restant"
          value={formatCurrency(invoice.remainingAmount, invoice.currency)}
        />
      </dl>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-1">
      <dt className="text-[var(--c-text-muted)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}