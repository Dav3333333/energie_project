import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, FileDown } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import DateRangeFilter from '@/components/common/DateRangeFilter';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import ConsumptionChart from '@/components/charts/ConsumptionChart';
import TouchCard from '@/components/mobile/TouchCard';
import StatusBadge from '@/components/common/StatusBadge';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGalleries, useGallery } from '@/features/galleries/hooks/useGalleries';
import { useShopsByGallery } from '@/features/shops/hooks/useShops';
import { useReadingsAcrossScope } from '@/features/readings/hooks/useReadings';
import { usePurchasesAcrossScope } from '@/features/energyPurchases/hooks/usePurchases';
import { formatKwh, formatCurrency } from '@/lib/formatters';
import { downloadReportPdf } from '../services/reportPdf';
import { ROLES } from '@/constants/roles';

export default function ReportsPage() {
  const { galleryId } = useParams();
  const { profile, galleryIds = [] } = useAuth();
  const isSuperAdmin = profile?.role === ROLES.SUPER_ADMIN;

  if (isSuperAdmin && !galleryId) return <GalleryReportPicker />;
  const reportGalleryId = isSuperAdmin ? galleryId : galleryIds[0];
  if (!reportGalleryId || (!isSuperAdmin && !galleryIds.includes(reportGalleryId))) {
    return <AppShell title="Rapports"><EmptyState title="Aucune galerie accessible" description="Le rapport n’est disponible que pour votre galerie." /></AppShell>;
  }
  return <GalleryReport key={reportGalleryId} galleryId={reportGalleryId} />;
}

function GalleryReportPicker() {
  const { data: galleries, isLoading } = useGalleries({ status: 'ACTIVE' });
  const navigate = useNavigate();

  return (
    <AppShell title="Rapports">
      <PageHeader title="Rapports par galerie" subtitle="Choisissez une galerie pour consulter son rapport." />
      <div className="mt-4 space-y-3">
        {isLoading ? <LoadingState /> : galleries?.length ? galleries.map((gallery) => (
          <button key={gallery.id} type="button" onClick={() => navigate(`/reports/${gallery.id}`)} className="block w-full text-left">
            <TouchCard interactive title={gallery.name} subtitle={`${gallery.code} · ${gallery.city || '—'}`} trailing={<StatusBadge status={gallery.status} />} />
          </button>
        )) : <EmptyState icon={<Building2 size={30} />} title="Aucune galerie active" />}
      </div>
    </AppShell>
  );
}

function GalleryReport({ galleryId }) {
  const { data: gallery } = useGallery(galleryId);
  const { data: shops = [] } = useShopsByGallery(galleryId, { status: 'ACTIVE' });
  const { data: readings = [] } = useReadingsAcrossScope([galleryId], { pageSize: 200 });
  const { data: purchases = [] } = usePurchasesAcrossScope([galleryId], { status: 'VALID' });
  const [period, setPeriod] = useState({ from: '', to: '' });

  const filteredReadings = useMemo(() => {
    if (!period.from && !period.to) return readings;
    const from = period.from ? new Date(period.from).getTime() : 0;
    const to = period.to ? new Date(`${period.to}T23:59:59.999`).getTime() : Infinity;
    return readings.filter((reading) => {
      const time = reading.readingDate?.toDate?.().getTime?.() ?? new Date(reading.readingDate).getTime();
      return time >= from && time <= to;
    });
  }, [readings, period]);

  const filteredPurchases = useMemo(() => {
    if (!period.from && !period.to) return purchases;
    const from = period.from ? new Date(period.from).getTime() : 0;
    const to = period.to ? new Date(`${period.to}T23:59:59.999`).getTime() : Infinity;
    return purchases.filter((purchase) => {
      const time = purchase.purchaseDate?.toDate?.().getTime?.() ?? new Date(purchase.purchaseDate).getTime();
      return time >= from && time <= to;
    });
  }, [purchases, period]);

  const totalConsumed = filteredReadings.reduce((sum, reading) => sum + Number(reading.consumptionKwh ?? 0), 0);
  const totalPurchased = filteredPurchases.reduce((sum, purchase) => sum + Number(purchase.purchasedKwh ?? 0), 0);
  const spendByCurrency = filteredPurchases.reduce((totals, purchase) => {
    const currency = purchase.currency ?? gallery?.currency ?? 'USD';
    totals[currency] = (totals[currency] ?? 0) + Number(purchase.totalAmount ?? 0);
    return totals;
  }, {});
  const totalSpentLabel = Object.entries(spendByCurrency).map(([currency, amount]) => formatCurrency(amount, currency)).join(' · ') || '—';

  const onExport = () => downloadReportPdf({
    shops,
    readings: filteredReadings,
    purchases: filteredPurchases,
    period,
    totals: { totalConsumed, totalPurchased, totalSpentLabel },
  });

  return (
    <AppShell title={gallery?.name ? `Rapport · ${gallery.name}` : 'Rapport de galerie'} showBack>
      <PageHeader title={gallery?.name ?? 'Rapport de galerie'} subtitle="Consommation, achats et soldes de cette galerie" actions={<Button size="sm" variant="outline" onClick={onExport}><FileDown size={16} /> PDF</Button>} />
      <DateRangeFilter from={period.from} to={period.to} onChange={setPeriod} />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard label="Consommé" value={formatKwh(totalConsumed)} />
        <StatCard label="Acheté" value={formatKwh(totalPurchased)} />
        <StatCard label="Montant achats" value={totalSpentLabel} />
        <StatCard label="Boutiques actives" value={shops.length} />
      </div>
      <section className="mt-6">
        <h2 className="font-semibold mb-3">Évolution des relevés</h2>
        {filteredReadings.length ? <ConsumptionChart readings={filteredReadings} /> : <EmptyState title="Pas de données sur la période" />}
      </section>
      <section className="mt-6">
        <h2 className="font-semibold mb-3">Achats récents</h2>
        {filteredPurchases.length ? (
          <ul className="space-y-2">{filteredPurchases.slice(0, 10).map((purchase) => (
            <li key={purchase.id} className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-3 text-sm flex justify-between">
              <span>{purchase.receiptNumber}</span><span className="font-medium">{formatCurrency(purchase.totalAmount, purchase.currency)}</span>
            </li>
          ))}</ul>
        ) : <EmptyState title="Aucun achat sur la période" />}
      </section>
    </AppShell>
  );
}
