import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Wrench } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import TouchCard from '@/components/mobile/TouchCard';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import Button from '@/components/ui/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useIncidentsByGallery } from '../hooks/useIncidents';
import { formatDateTime } from '@/lib/formatters';
import { ROLES } from '@/constants/roles';

const STATUS_LABEL = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Résolu',
  CLOSED: 'Clôturé',
};

const PRIORITY_TONE = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-brand-100 text-brand-800',
  HIGH: 'bg-warning-light text-warning-dark',
  CRITICAL: 'bg-danger-light text-danger-dark',
};

export default function IncidentsPage() {
  const { profile, galleryIds } = useAuth();
  const navigate = useNavigate();
  const galleryId = galleryIds?.[0];
  const [statusFilter, setStatusFilter] = useState('OPEN');

  const { data: incidents, isLoading } = useIncidentsByGallery(galleryId, {
    status: statusFilter || undefined,
  });

  const canCreate = [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN, ROLES.TECHNICIAN].includes(profile?.role);

  return (
    <AppShell title="Incidents">
      <PageHeader
        title="Incidents"
        subtitle={`${incidents?.length ?? 0} résultat(s)`}
        actions={
          canCreate && (
            <Button size="sm" onClick={() => navigate('/incidents/new')}>
              <Plus size={16} /> Nouveau
            </Button>
          )
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', ''].map((v) => (
          <button
            key={v || 'all'}
            onClick={() => setStatusFilter(v)}
            className={`px-3 min-h-touch rounded-full text-xs font-medium whitespace-nowrap ${
              statusFilter === v
                ? 'bg-brand-600 text-white'
                : 'bg-[var(--c-surface)] border border-[var(--c-border)]'
            }`}
          >
            {v ? STATUS_LABEL[v] : 'Tous'}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <LoadingState />
        ) : incidents?.length ? (
          incidents.map((inc) => (
            <Link key={inc.id} to={`/incidents/${inc.id}`} className="block">
              <TouchCard
                interactive
                title={inc.title}
                subtitle={`${inc.category} · ${formatDateTime(inc.updatedAt)}`}
                trailing={
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      PRIORITY_TONE[inc.priority]
                    }`}
                  >
                    {inc.priority}
                  </span>
                }
              />
            </Link>
          ))
        ) : (
          <EmptyState icon={<Wrench size={28} />} title="Aucun incident" />
        )}
      </div>
    </AppShell>
  );
}