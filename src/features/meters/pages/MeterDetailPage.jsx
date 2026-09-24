import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import { useMeter } from '../hooks/useMeters';
import { useReadingsByMeter } from '@/features/readings/hooks/useReadings';
import { formatDateTime, formatKwh } from '@/lib/formatters';

export default function MeterDetailPage() {
  const { meterId } = useParams();
  const navigate = useNavigate();
  const { data: meter, isLoading } = useMeter(meterId);
  const { data: readings } = useReadingsByMeter(meterId, { pageSize: 50 });

  if (isLoading) return <AppShell title="Compteur"><LoadingState /></AppShell>;
  if (!meter) return <AppShell title="Compteur"><EmptyState title="Compteur introuvable" /></AppShell>;

  const lastReadings = (readings ?? []).slice(0, 10);

  return (
    <AppShell title={meter.name} showBack>
      <PageHeader
        title={meter.name}
        subtitle={`${meter.code} · ${meter.type}`}
        actions={<StatusBadge status={meter.status} />}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Dernier index" value={formatKwh(meter.lastTotalKwh, { withUnit: false })} />
        <StatCard label="Index initial" value={formatKwh(meter.initialKwh, { withUnit: false })} />
        <StatCard label="Dernier relevé" value={formatDateTime(meter.lastReadingAt)} />
        <StatCard label="Mode" value={meter.readingMode} />
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          size="sm"
          onClick={() => navigate(`/readings/new?meterId=${meterId}`)}
        >
          <Plus size={16} /> Nouveau relevé
        </Button>
      </div>

      <h2 className="mt-6 mb-3 font-semibold">Derniers relevés</h2>
      {lastReadings.length === 0 ? (
        <EmptyState title="Aucun relevé" />
      ) : (
        <ul className="space-y-2">
          {lastReadings.map((r) => (
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
      )}
    </AppShell>
  );
}