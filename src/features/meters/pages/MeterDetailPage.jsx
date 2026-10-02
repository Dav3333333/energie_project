import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useMeter } from '../hooks/useMeters';
import { useReadingsByMeter } from '@/features/readings/hooks/useReadings';
import { formatDateTime, formatKwh } from '@/lib/formatters';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLES } from '@/constants/roles';
import { callables, callableError } from '@/lib/firebase/callables';
import { meterUpdateSchema } from '../schemas/meterSchemas';

function MeterEditForm({ meter, onDone }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(meterUpdateSchema),
    defaultValues: { name: meter.name, serialNumber: meter.serialNumber ?? '', description: meter.description ?? '' },
  });
  const submit = async (values) => {
    try {
      await callables.updateMeter({ meterId: meter.id, patch: { ...values, serialNumber: values.serialNumber || null, description: values.description || null } });
      toast.success('Compteur modifié.');
      onDone();
    } catch (error) { toast.error(callableError(error).message); }
  };
  return (
    <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-3 rounded-xl border border-[var(--c-border)] p-4">
      <h2 className="font-semibold">Modifier le compteur</h2>
      <Input label="Nom" error={errors.name?.message} {...register('name')} />
      <Input label="N° de série" error={errors.serialNumber?.message} {...register('serialNumber')} />
      <Input label="Description" error={errors.description?.message} {...register('description')} />
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onDone}>Annuler</Button><Button type="submit" loading={isSubmitting}>Enregistrer</Button></div>
    </form>
  );
}

export default function MeterDetailPage() {
  const { meterId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canManage = [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(profile?.role);
  const [editing, setEditing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const { data: meter, isLoading } = useMeter(meterId);
  const { data: readings } = useReadingsByMeter(meterId, { pageSize: 50 });

  if (isLoading) return <AppShell title="Compteur"><LoadingState /></AppShell>;
  if (!meter) return <AppShell title="Compteur"><EmptyState title="Compteur introuvable" /></AppShell>;

  const lastReadings = (readings ?? []).slice(0, 10);
  const archive = async () => {
    setArchiving(true);
    try {
      await callables.archiveMeter({ meterId, reason: 'Archivage demandé depuis la fiche compteur' });
      toast.success('Compteur supprimé de la liste active. Son historique est conservé.');
      navigate('/meters', { replace: true });
    } catch (error) { toast.error(callableError(error).message); }
    finally { setArchiving(false); setConfirmArchive(false); }
  };

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
        <StatCard label="Énergie achetée" value={formatKwh(meter.totalPurchasedKwh, { withUnit: true })} />
        <StatCard label="Consommée" value={formatKwh(meter.totalConsumedKwh, { withUnit: true })} />
        <StatCard label="Crédit restant" value={formatKwh(meter.remainingKwh, { withUnit: true })} />
        <StatCard label="Solde restant" value={meter.remainingAmount == null ? '—' : `${Number(meter.remainingAmount).toFixed(2)} ${meter.currency ?? ''}`} />
      </div>

      {canManage && meter.status !== 'ARCHIVED' && (
        <>
          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing((value) => !value)}><Pencil size={16} /> Modifier</Button>
            <Button size="sm" variant="danger" onClick={() => setConfirmArchive(true)}><Trash2 size={16} /> Supprimer</Button>
          </div>
          {editing && <MeterEditForm meter={meter} onDone={() => setEditing(false)} />}
          <ConfirmDialog open={confirmArchive} onClose={() => setConfirmArchive(false)} onConfirm={archive} loading={archiving} title="Supprimer ce compteur ?" confirmLabel="Supprimer" message="Le compteur sera archivé et retiré des listes actives. Les relevés et l’historique seront conservés." />
        </>
      )}

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
