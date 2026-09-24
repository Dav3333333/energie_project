import { useState } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import Button from '@/components/ui/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAlertsByGallery } from '../hooks/useAlerts';
import { callables, callableError } from '@/lib/firebase/callables';
import { formatDateTime } from '@/lib/formatters';
import { ROLES } from '@/constants/roles';

const SEVERITY_STYLE = {
  INFO: 'bg-slate-100 text-slate-700',
  WARNING: 'bg-warning-light text-warning-dark',
  CRITICAL: 'bg-danger-light text-danger-dark',
};

const SEVERITY_LABEL = {
  INFO: 'Info',
  WARNING: 'Attention',
  CRITICAL: 'Critique',
};

const STATUS_LABEL = {
  OPEN: 'Ouverte',
  ACKNOWLEDGED: 'Pris en compte',
  RESOLVED: 'Résolue',
};

export default function AlertsPage() {
  const { profile, galleryIds } = useAuth();
  const galleryId = galleryIds?.[0];
  const [statusFilter, setStatusFilter] = useState('OPEN');

  const { data: alerts, isLoading } = useAlertsByGallery(galleryId, {
    status: statusFilter || undefined,
  });

  const canAct = [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN, ROLES.TECHNICIAN].includes(profile?.role);

  const onAck = async (id) => {
    try {
      await callables.acknowledgeAlert({ alertId: id });
      toast.success('Alerte prise en compte.');
    } catch (err) {
      toast.error(callableError(err).message);
    }
  };

  const onResolve = async (id) => {
    try {
      await callables.resolveAlert({ alertId: id });
      toast.success('Alerte résolue.');
    } catch (err) {
      toast.error(callableError(err).message);
    }
  };

  return (
    <AppShell title="Alertes">
      <PageHeader title="Alertes" subtitle={`${alerts?.length ?? 0} résultat(s)`} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['OPEN', 'ACKNOWLEDGED', 'RESOLVED', ''].map((v) => (
          <button
            key={v || 'all'}
            onClick={() => setStatusFilter(v)}
            className={`px-3 min-h-touch rounded-full text-xs font-medium whitespace-nowrap ${
              statusFilter === v
                ? 'bg-brand-600 text-white'
                : 'bg-[var(--c-surface)] border border-[var(--c-border)]'
            }`}
          >
            {v ? STATUS_LABEL[v] : 'Toutes'}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <LoadingState />
        ) : alerts?.length ? (
          alerts.map((a) => (
            <div
              key={a.id}
              className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-3 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.title}</p>
                  <p className="text-xs text-[var(--c-text-muted)] mt-0.5">
                    {formatDateTime(a.createdAt)}
                  </p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    SEVERITY_STYLE[a.severity] ?? SEVERITY_STYLE.INFO
                  }`}
                >
                  {SEVERITY_LABEL[a.severity] ?? a.severity}
                </span>
              </div>

              <p className="mt-2 text-sm">{a.message}</p>

              {canAct && a.status === 'OPEN' && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onAck(a.id)}>
                    <Bell size={14} /> Prendre en compte
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => onResolve(a.id)}>
                    <CheckCircle2 size={14} /> Résoudre
                  </Button>
                </div>
              )}
              {canAct && a.status === 'ACKNOWLEDGED' && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="primary" onClick={() => onResolve(a.id)}>
                    <CheckCircle2 size={14} /> Résoudre
                  </Button>
                </div>
              )}
              {!canAct && (
                <p className="mt-2 text-xs text-[var(--c-text-muted)]">
                  Statut : {STATUS_LABEL[a.status] ?? a.status}
                </p>
              )}
            </div>
          ))
        ) : (
          <EmptyState
            icon={<Bell size={28} />}
            title="Aucune alerte"
            description="Tout est normal pour le moment."
          />
        )}
      </div>
    </AppShell>
  );
}