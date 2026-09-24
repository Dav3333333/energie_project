import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Plus, Gauge } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import TouchCard from '@/components/mobile/TouchCard';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import Button from '@/components/ui/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMetersByGallery } from '../hooks/useMeters';
import { ROLES } from '@/constants/roles';

export default function MetersPage() {
  const { profile, galleryIds } = useAuth();
  const navigate = useNavigate();
  const galleryId = galleryIds?.[0];
  const { data: meters, isLoading } = useMetersByGallery(galleryId, { status: 'ACTIVE' });

  return (
    <AppShell title="Compteurs">
      <PageHeader
        title="Compteurs"
        subtitle={`${meters?.length ?? 0} résultat(s)`}
        actions={
          [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN, ROLES.TECHNICIAN].includes(profile?.role) && (
            <Button size="sm" onClick={() => navigate('/meters/new')}>
              <Plus size={16} /> Nouveau
            </Button>
          )
        }
      />

      <div className="mt-2 space-y-3">
        {isLoading ? (
          <LoadingState />
        ) : meters?.length ? (
          meters.map((m) => (
            <Link key={m.id} to={`/meters/${m.id}`} className="block">
              <TouchCard
                interactive
                title={m.name}
                subtitle={`${m.code} · ${m.type}`}
                trailing={<StatusBadge status={m.status} />}
              />
            </Link>
          ))
        ) : (
          <EmptyState icon={<Gauge size={28} />} title="Aucun compteur" />
        )}
      </div>
    </AppShell>
  );
}