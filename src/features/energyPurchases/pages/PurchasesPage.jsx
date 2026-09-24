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
import { usePurchasesByGallery } from '../hooks/usePurchases';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { ROLES } from '@/constants/roles';

export default function PurchasesPage() {
  const { profile, galleryIds } = useAuth();
  const navigate = useNavigate();
  const galleryId = galleryIds?.[0];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: purchases, isLoading } = usePurchasesByGallery(galleryId, {
    status: statusFilter || undefined,
  });

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
        subtitle={`${filtered.length} résultat(s)`}
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
            description="Enregistrez votre premier achat de kWh."
          />
        ) : (
          filtered.map((p) => (
            <Link key={p.id} to={`/energy-purchases/${p.id}`} className="block">
              <TouchCard
                interactive
                title={`${p.purchasedKwh} kWh — ${formatCurrency(p.totalAmount, p.currency)}`}
                subtitle={`${p.receiptNumber} · ${formatDateTime(p.purchaseDate)}`}
                trailing={<StatusBadge status={p.status} />}
              />
            </Link>
          ))
        )}
      </div>
    </AppShell>
  );
}