import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Gauge, Plus } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import TouchCard from '@/components/mobile/TouchCard';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import { useShop } from '../hooks/useShops';
import { useMetersByShop } from '@/features/meters/hooks/useMeters';
import { useReadingsByShop } from '@/features/readings/hooks/useReadings';
import { formatDateTime, formatKwh, formatCurrency } from '@/lib/formatters';

const TABS = ['Aperçu', 'Compteurs', 'Relevés'];

export default function ShopDetailPage() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Aperçu');

  const { data: shop, isLoading } = useShop(shopId);
  const { data: meters } = useMetersByShop(shopId);
  const { data: readings } = useReadingsByShop(shopId, { pageSize: 20 });

  if (isLoading) return <AppShell title="Boutique"><LoadingState /></AppShell>;
  if (!shop) return <AppShell title="Boutique"><EmptyState title="Boutique introuvable" /></AppShell>;

  return (
    <AppShell title={shop.name} showBack>
      <PageHeader
        title={shop.name}
        subtitle={`${shop.code} · ${shop.location || '—'}`}
        actions={<StatusBadge status={shop.balanceStatus} />}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Crédit restant" value={formatKwh(shop.remainingKwh)} />
        <StatCard
          label="Montant restant"
          value={formatCurrency(shop.remainingAmount, shop.activePricePerKwh ? 'USD' : 'USD')}
        />
        <StatCard label="Total consommé" value={formatKwh(shop.totalConsumedKwh)} />
        <StatCard label="Total acheté" value={formatKwh(shop.totalPurchasedKwh)} />
        <StatCard
          label="Conso. moy. / jour"
          value={shop.averageDailyConsumptionKwh ? formatKwh(shop.averageDailyConsumptionKwh) : '—'}
        />
        <StatCard
          label="Autonomie estimée"
          value={shop.estimatedDaysRemaining != null ? `${shop.estimatedDaysRemaining} j` : '—'}
        />
      </div>

      <nav className="mt-6 flex gap-1 border-b border-[var(--c-border)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 min-h-touch text-sm font-medium ${
              tab === t ? 'text-brand-600 border-b-2 border-brand-600' : 'text-[var(--c-text-muted)]'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="mt-4 space-y-3">
        {tab === 'Aperçu' && (
          <dl className="space-y-2 text-sm">
            <Row label="Dernier relevé" value={formatDateTime(shop.lastReadingAt)} />
            <Row label="Dernier achat" value={formatDateTime(shop.lastPurchaseAt)} />
            <Row
              label="Dernière estimation"
              value={formatDateTime(shop.lastBalanceCalculatedAt)}
            />
            <Row label="État du courant" value={shop.currentPowerStatus} />
          </dl>
        )}

        {tab === 'Compteurs' && (
          <>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => navigate(`/meters/new?shopId=${shopId}`)}>
                <Plus size={16} /> Nouveau compteur
              </Button>
            </div>
            {meters?.length ? (
              meters.map((m) => (
                <Link key={m.id} to={`/meters/${m.id}`} className="block">
                  <TouchCard
                    interactive
                    title={m.name}
                    subtitle={`${m.code} · Dernier index : ${formatKwh(m.lastTotalKwh, { withUnit: false })}`}
                    trailing={<StatusBadge status={m.status} />}
                  />
                </Link>
              ))
            ) : (
              <EmptyState icon={<Gauge size={28} />} title="Aucun compteur" />
            )}
          </>
        )}

        {tab === 'Relevés' && (
          <>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => navigate(`/readings/new?shopId=${shopId}`)}>
                <Plus size={16} /> Nouveau relevé
              </Button>
            </div>
            {readings?.length ? (
              readings.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-3 text-sm"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{formatDateTime(r.readingDate)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-[var(--c-text-muted)] text-xs mt-1">
                    Index : {r.totalKwh} · Consommation : {r.consumptionKwh ?? '—'} kWh
                  </p>
                </div>
              ))
            ) : (
              <EmptyState title="Aucun relevé" />
            )}
          </>
        )}
      </div>
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