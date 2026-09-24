import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import TouchCard from '@/components/mobile/TouchCard';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import { useGallery } from '../hooks/useGalleries';
import { useShopsByGallery } from '@/features/shops/hooks/useShops';
import { formatCurrency } from '@/lib/formatters';
import { Link, useNavigate } from 'react-router-dom';

const TABS = ['Boutiques', 'Infos', 'Tarifs'];

export default function GalleryDetailPage() {
  const { galleryId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Boutiques');

  const { data: gallery, isLoading } = useGallery(galleryId);
  const { data: shops } = useShopsByGallery(galleryId, { status: 'ACTIVE' });

  if (isLoading) return <AppShell title="Galerie"><LoadingState /></AppShell>;
  if (!gallery) return <AppShell title="Galerie"><EmptyState title="Galerie introuvable" /></AppShell>;

  const totalConsumed = (shops ?? []).reduce((s, x) => s + (x.totalConsumedKwh ?? 0), 0);
  const totalPurchased = (shops ?? []).reduce((s, x) => s + (x.totalPurchasedKwh ?? 0), 0);
  const totalRemaining = (shops ?? []).reduce((s, x) => s + (x.remainingKwh ?? 0), 0);
  const lowCount = (shops ?? []).filter((s) => s.balanceStatus === 'LOW').length;
  const critCount = (shops ?? []).filter((s) => ['CRITICAL', 'EXHAUSTED'].includes(s.balanceStatus)).length;

  return (
    <AppShell title={gallery.name} showBack>
      <PageHeader
        title={gallery.name}
        subtitle={`${gallery.code} · ${gallery.city || '—'}`}
        actions={<StatusBadge status={gallery.status} />}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Boutiques actives" value={shops?.length ?? 0} />
        <StatCard label="Crédit faible" value={lowCount} tone={lowCount ? 'warning' : 'default'} />
        <StatCard label="Critique / épuisé" value={critCount} tone={critCount ? 'danger' : 'default'} />
        <StatCard label="Crédit total restant" value={`${totalRemaining.toFixed(1)} kWh`} />
        <StatCard label="Total consommé" value={`${totalConsumed.toFixed(1)} kWh`} />
        <StatCard label="Total acheté" value={`${totalPurchased.toFixed(1)} kWh`} />
      </div>

      <nav className="mt-6 flex gap-1 border-b border-[var(--c-border)]" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-3 min-h-touch text-sm font-medium ${
              tab === t
                ? 'text-brand-600 border-b-2 border-brand-600'
                : 'text-[var(--c-text-muted)]'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="mt-4">
        {tab === 'Boutiques' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => navigate(`/shops/new?galleryId=${galleryId}`)}>
                <Plus size={16} /> Nouvelle boutique
              </Button>
            </div>
            {shops?.length ? (
              shops.map((s) => (
                <Link key={s.id} to={`/shops/${s.id}`} className="block">
                  <TouchCard
                    interactive
                    title={s.name}
                    subtitle={`${s.code} · Reste ${s.remainingKwh ?? 0} kWh`}
                    trailing={<StatusBadge status={s.balanceStatus} />}
                  />
                </Link>
              ))
            ) : (
              <EmptyState title="Aucune boutique" description="Ajoutez une première boutique." />
            )}
          </div>
        )}

        {tab === 'Infos' && (
          <dl className="space-y-3 text-sm">
            <Row label="Adresse" value={gallery.address || '—'} />
            <Row label="Ville" value={gallery.city || '—'} />
            <Row label="Pays" value={gallery.country || '—'} />
            <Row label="Téléphone" value={gallery.phone || '—'} />
            <Row label="Email" value={gallery.email || '—'} />
            <Row label="Devise" value={gallery.currency} />
            <Row label="Prix par défaut" value={formatCurrency(gallery.defaultPricePerKwh, gallery.currency)} />
            <Row label="Seuil crédit faible" value={`${gallery.lowCreditThresholdKwh} kWh`} />
            <Row label="Seuil critique" value={`${gallery.criticalCreditThresholdKwh} kWh`} />
          </dl>
        )}

        {tab === 'Tarifs' && (
          <EmptyState title="Tarifs" description="Gestion des tarifs à l'ÉTAPE 5." />
        )}
      </div>
    </AppShell>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-[var(--c-border)] last:border-0">
      <dt className="text-[var(--c-text-muted)]">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}