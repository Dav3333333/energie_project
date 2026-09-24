import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useReadingsByGallery } from '../hooks/useReadings';
import { formatDateTime } from '@/lib/formatters';
import { ROLES } from '@/constants/roles';

export default function ReadingsPage() {
  const { profile, galleryIds } = useAuth();
  const navigate = useNavigate();
  const galleryId = galleryIds?.[0];
  const { data: readings, isLoading } = useReadingsByGallery(galleryId, { pageSize: 50 });

  return (
    <AppShell title="Relevés">
      <PageHeader
        title="Relevés"
        subtitle={`${readings?.length ?? 0} dernier(s)`}
        actions={
          [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN, ROLES.TECHNICIAN].includes(profile?.role) && (
            <Button size="sm" onClick={() => navigate('/readings/new')}>
              <Plus size={16} /> Nouveau
            </Button>
          )
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : readings?.length ? (
        <ul className="space-y-2">
          {readings.map((r) => (
            <li
              key={r.id}
              className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-3 text-sm"
            >
              <div className="flex justify-between">
                <span className="font-medium">{formatDateTime(r.readingDate)}</span>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-[var(--c-text-muted)] text-xs mt-1">
                Index : {r.totalKwh} · Conso : {r.consumptionKwh ?? '—'} kWh
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Aucun relevé" description="Créez le premier relevé." />
      )}
    </AppShell>
  );
}