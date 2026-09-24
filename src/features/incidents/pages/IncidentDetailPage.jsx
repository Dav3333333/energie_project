import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import { useIncident } from '../hooks/useIncidents';
import { callables, callableError } from '@/lib/firebase/callables';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLES } from '@/constants/roles';
import { formatDateTime } from '@/lib/formatters';

export default function IncidentDetailPage() {
  const { incidentId } = useParams();
  const { profile } = useAuth();
  const { data: incident, isLoading } = useIncident(incidentId);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  if (isLoading) return <AppShell title="Incident" showBack><LoadingState /></AppShell>;
  if (!incident) return <AppShell title="Incident" showBack><EmptyState title="Incident introuvable" /></AppShell>;

  const canAct = [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN, ROLES.TECHNICIAN].includes(profile?.role);

  const updateStatus = async (status) => {
    setUpdating(true);
    try {
      await callables.updateIncidentStatus({
        incidentId,
        status,
        resolutionNotes: notes || null,
      });
      toast.success('Incident mis à jour.');
      setNotes('');
    } catch (err) {
      toast.error(callableError(err).message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AppShell title={incident.title} showBack>
      <PageHeader
        title={incident.title}
        subtitle={`${incident.category} · ${incident.priority}`}
        actions={<StatusBadge status={incident.status} />}
      />

      <div className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-4 shadow-card">
        <p className="text-sm whitespace-pre-line">{incident.description}</p>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <Row label="Ouvert le" value={formatDateTime(incident.openedAt)} />
        <Row label="Mis à jour" value={formatDateTime(incident.updatedAt)} />
        {incident.resolvedAt && <Row label="Résolu le" value={formatDateTime(incident.resolvedAt)} />}
        {incident.assignedToUserId && <Row label="Assigné à" value={incident.assignedToUserId} />}
        {incident.resolutionNotes && <Row label="Notes" value={incident.resolutionNotes} />}
      </dl>

      {canAct && incident.status !== 'RESOLVED' && incident.status !== 'CLOSED' && (
        <section className="mt-6 space-y-3">
          <h2 className="font-semibold">Mettre à jour</h2>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes de résolution (facultatif pour passage en cours)"
            className="w-full px-3 py-2 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] focus:border-brand-500 focus:outline-none"
          />
          <div className="flex gap-2">
            {incident.status === 'OPEN' && (
              <Button
                variant="outline"
                size="md"
                className="flex-1"
                onClick={() => updateStatus('IN_PROGRESS')}
                loading={updating}
              >
                En cours
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={() => updateStatus('RESOLVED')}
              loading={updating}
            >
              Résoudre
            </Button>
          </div>
        </section>
      )}
    </AppShell>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-[var(--c-border)] last:border-0 gap-3">
      <dt className="text-[var(--c-text-muted)]">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}