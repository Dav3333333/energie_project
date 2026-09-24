import { useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import DateRangeFilter from '@/components/common/DateRangeFilter';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/common/EmptyState';
import ConsumptionChart from '@/components/charts/ConsumptionChart';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useShopsByGallery } from '@/features/shops/hooks/useShops';
import { useReadingsByGallery } from '@/features/readings/hooks/useReadings';
import { usePurchasesByGallery } from '@/features/energyPurchases/hooks/usePurchases';
import { formatKwh, formatCurrency, formatDate } from '@/lib/formatters';
import { downloadReportPdf } from '../services/reportPdf';

export default function ReportsPage() {
  const { galleryIds } = useAuth();
  const galleryId = galleryIds?.[0];
  const { data: shops } = useShopsByGallery(galleryId, { status: 'ACTIVE' });
  const { data: readings } = useReadingsByGallery(galleryId, { pageSize: 200 });
  const { data: purchases } = usePurchasesByGallery(galleryId, { status: 'VALID', pageSize: 200 });

  const [period, setPeriod] = useState({
    from: '',
    to: '',
  });

  const filteredReadings = useMemo(() => {
    if (!period.from && !period.to) return readings ?? [];
    const from = period.from ? new Date(period.from).getTime() : 0;
    const to = period.to ? new Date(period.to).getTime() : Infinity;
    return (readings ?? []).filter((r) => {
      const t = r.readingDate?.toDate?.().getTime?.() ?? new Date(r.readingDate).getTime();
      return t >= from && t <= to;
    });
  }, [readings, period]);

  const filteredPurchases = useMemo(() => {
    if (!period.from && !period.to) return purchases ?? [];
    const from = period.from ? new Date(period.from).getTime() : 0;
    const to = period.to ? new Date(period.to).getTime() : Infinity;
    return (purchases ?? []).filter((p) => {
      const t = p.purchaseDate?.toDate?.().getTime?.() ?? new Date(p.purchaseDate).getTime();
      return t >= from && t <= to;
    });
  }, [purchases, period]);

  const totalConsumed = filteredReadings.reduce((s, r) => s + Number(r.consumptionKwh ?? 0), 0);
  const totalPurchased = filteredPurchases.reduce((s, p) => s + Number(p.purchasedKwh ?? 0), 0);
  const totalSpent = filteredPurchases.reduce((s, p) => s + Number(p.totalAmount ?? 0), 0);

  const onExport = () => {
    downloadReportPdf({
      shops: shops ?? [],
      readings: filteredReadings,
      purchases: filteredPurchases,
      period,
      totals: { totalConsumed, totalPurchased, totalSpent },
    });
  };

  return (
    <AppShell title="Rapports">
      <PageHeader
        title="Rapports"
        subtitle="Consommation, achats, soldes"
        actions={
          <Button size="sm" variant="outline" onClick={onExport}>
            <FileDown size={16} /> PDF
          </Button>
        }
      />

      <DateRangeFilter from={period.from} to={period.to} onChange={setPeriod} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard label="Consommé" value={formatKwh(totalConsumed)} />
        <StatCard label="Acheté" value={formatKwh(totalPurchased)} />
        <StatCard label="Montant achats" value={formatCurrency(totalSpent, 'USD')} />
        <StatCard label="Boutiques" value={shops?.length ?? 0} />
      </div>

      <section className="mt-6">
        <h2 className="font-semibold mb-3">Évolution des index (toutes boutiques)</h2>
        {filteredReadings?.length ? (
          <ConsumptionChart readings={filteredReadings} />
        ) : (
          <EmptyState title="Pas de données sur la période" />
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-semibold mb-3">Achats récents</h2>
        {filteredPurchases?.length ? (
          <ul className="space-y-2">
            {filteredPurchases.slice(0, 10).map((p) => (
              <li
                key={p.id}
                className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-3 text-sm flex justify-between"
              >
                <span>{p.receiptNumber}</span>
                <span className="font-medium">{formatCurrency(p.totalAmount, p.currency)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Aucun achat sur la période" />
        )}
      </section>
    </AppShell>
  );
}