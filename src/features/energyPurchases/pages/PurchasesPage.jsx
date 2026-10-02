import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ShoppingCart } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import SearchInput from '@/components/common/SearchInput';
import TouchCard from '@/components/mobile/TouchCard';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePurchasesAcrossScope, usePurchasesAcrossShops } from '../hooks/usePurchases';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { ROLES } from '@/constants/roles';

export default function PurchasesPage() {
  const { profile, galleryIds, shopIds } = useAuth();
  const navigate = useNavigate();
  const isShopOwner = profile?.role === ROLES.SHOP_OWNER;
  const scopeGalleryIds = isShopOwner ? [] : profile?.role === ROLES.SUPER_ADMIN ? null : (galleryIds ?? []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const galleryPurchases = usePurchasesAcrossScope(scopeGalleryIds, {
    status: statusFilter || undefined,
  });
  const shopPurchases = usePurchasesAcrossShops(isShopOwner ? (shopIds ?? profile?.shopIds ?? []) : [], {
    status: statusFilter || undefined,
  });
  const purchases = isShopOwner ? shopPurchases.data : galleryPurchases.data;
  const isLoading = isShopOwner ? shopPurchases.isLoading : galleryPurchases.isLoading;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return purchases ?? [];
    return (purchases ?? []).filter(
      (p) =>
        p.receiptNumber?.toLowerCase().includes(s) ||
        p.paymentReference?.toLowerCase().includes(s),
    );
  }, [purchases, search]);

  const canCreate = [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(profile?.role);

  return (
    <AppShell title="Achats kWh">
      <PageHeader
        title="Achats kWh"
        subtitle={isShopOwner ? `Achats de vos boutiques · ${filtered.length} résultat(s)` : `${filtered.length} résultat(s)`}
        actions={
          canCreate && (
            <Button size="sm" onClick={() => navigate('/energy-purchases/new')}>
              <Plus size={16} /> Nouvel achat
            </Button>
          )
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="N° reçu, référence…" />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {[
          { v: '', label: 'Tous' },
          { v: 'VALID', label: 'Valides' },
          { v: 'CANCELLED', label: 'Annulés' },
        ].map((opt) => (
          <button
            key={opt.v}
            onClick={() => setStatusFilter(opt.v)}
            className={`px-3 min-h-touch rounded-full text-xs font-medium whitespace-nowrap ${
              statusFilter === opt.v
                ? 'bg-brand-600 text-white'
                : 'bg-[var(--c-surface)] border border-[var(--c-border)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={28} />}
            title="Aucun achat"
            description={isShopOwner ? 'Aucun achat n’a encore été enregistré pour vos boutiques.' : 'Enregistrez votre premier achat de kWh.'}
          />
        ) : (
          filtered.map((p) => (
            <Link key={p.id} to={`/energy-purchases/${p.id}`} className="block">
              <TouchCard
                interactive
                title={`${p.purchasedKwh} kWh — ${formatCurrency(p.totalAmount, p.currency)}`}
                subtitle={`${p.meterName ? `${p.meterName} · ` : ''}${p.meterType === 'MAIN' ? 'Compteur général · ' : ''}${p.receiptNumber} · ${formatDateTime(p.purchaseDate)}`}
                trailing={<StatusBadge status={p.status} />}
              />
            </Link>
          ))
        )}
      </div>
    </AppShell>
  );
}
