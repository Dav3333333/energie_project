import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Building2 } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import SearchInput from '@/components/common/SearchInput';
import TouchCard from '@/components/mobile/TouchCard';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import Button from '@/components/ui/Button';
import RoleGuard from '@/app/router/RoleGuard';
import { useGalleries } from '../hooks/useGalleries';
import { ROLES } from '@/constants/roles';
import { formatCurrency } from '@/lib/formatters';

export default function GalleriesPage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { data: galleries, isLoading } = useGalleries();

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return galleries ?? [];
    return (galleries ?? []).filter(
      (g) =>
        g.name?.toLowerCase().includes(s) ||
        g.code?.toLowerCase().includes(s) ||
        g.city?.toLowerCase().includes(s),
    );
  }, [galleries, search]);

  return (
    <AppShell title="Galeries">
      <PageHeader
        title="Galeries"
        subtitle={`${filtered.length} résultat(s)`}
        actions={
          <RoleGuard roles={[ROLES.SUPER_ADMIN]}>
            <Button size="sm" onClick={() => navigate('/galleries/new')}>
              <Plus size={16} /> Nouvelle
            </Button>
          </RoleGuard>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Nom, code, ville…" />

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Building2 size={32} />}
            title="Aucune galerie"
            description="Créez une galerie pour commencer."
          />
        ) : (
          filtered.map((g) => (
            <Link key={g.id} to={`/galleries/${g.id}`} className="block">
              <TouchCard
                interactive
                title={g.name}
                subtitle={`${g.code} · ${g.city || '—'} · ${formatCurrency(g.defaultPricePerKwh, g.currency)}/kWh`}
                trailing={<StatusBadge status={g.status} />}
              />
            </Link>
          ))
        )}
      </div>
    </AppShell>
  );
}