import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Store } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import SearchInput from '@/components/common/SearchInput';
import TouchCard from '@/components/mobile/TouchCard';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import Button from '@/components/ui/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useShopsByGallery } from '../hooks/useShops';
import { ROLES } from '@/constants/roles';
import { formatKwh } from '@/lib/formatters';

export default function ShopsPage() {
  const { profile, galleryIds } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  const galleryId = galleryIds?.[0] ?? null;
  const { data: shops, isLoading } = useShopsByGallery(galleryId, {
    status: statusFilter || undefined,
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return shops ?? [];
    return (shops ?? []).filter(
      (x) => x.name?.toLowerCase().includes(s) || x.code?.toLowerCase().includes(s),
    );
  }, [shops, search]);

  return (
    <AppShell title="Boutiques">
      <PageHeader
        title="Boutiques"
        subtitle={`${filtered.length} résultat(s)`}
        actions={
          (profile?.role === ROLES.SUPER_ADMIN || profile?.role === ROLES.GALLERY_ADMIN) && (
            <Button size="sm" onClick={() => navigate('/shops/new')}>
              <Plus size={16} /> Nouvelle
            </Button>
          )
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Nom ou code…" />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {[
          { v: 'ACTIVE', label: 'Actives' },
          { v: 'INACTIVE', label: 'Inactives' },
          { v: 'ARCHIVED', label: 'Archivées' },
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
          <EmptyState icon={<Store size={32} />} title="Aucune boutique" />
        ) : (
          filtered.map((s) => (
            <Link key={s.id} to={`/shops/${s.id}`} className="block">
              <TouchCard
                interactive
                title={s.name}
                subtitle={`${s.code} · Reste ${formatKwh(s.remainingKwh, { withUnit: true })}`}
                trailing={<StatusBadge status={s.balanceStatus} />}
              />
            </Link>
          ))
        )}
      </div>
    </AppShell>
  );
}