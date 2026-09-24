import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MobileFormLayout from '@/components/forms/MobileFormLayout';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMeter } from '@/features/meters/hooks/useMeters';
import { useMetersByShop } from '@/features/meters/hooks/useMeters';
import { callables, callableError } from '@/lib/firebase/callables';
import { readingCreateSchema } from '../schemas/readingSchemas';
import { formatKwh } from '@/lib/formatters';

export default function NewReadingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const presetMeterId = params.get('meterId');
  const presetShopId = params.get('shopId');

  const { data: presetMeter } = useMeter(presetMeterId ?? '');
  const { data: shopMeters } = useMetersByShop(presetShopId ?? '');
  const [selectedMeterId, setSelectedMeterId] = useState(presetMeterId ?? '');

  useEffect(() => {
    if (presetMeterId) setSelectedMeterId(presetMeterId);
    else if (shopMeters?.length === 1) setSelectedMeterId(shopMeters[0].id);
  }, [presetMeterId, shopMeters]);

  const { data: activeMeter } = useMeter(selectedMeterId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(readingCreateSchema),
    defaultValues: { meterId: selectedMeterId },
  });

  // Met à jour le champ meterId caché quand la sélection change.
  const availableMeters = presetShopId ? (shopMeters ?? []) : [];
  const canSubmit = !!selectedMeterId && !!activeMeter;

  const onSubmit = async (values) => {
    if (!selectedMeterId) {
      toast.error('Sélectionnez un compteur.');
      return;
    }
    try {
      const payload = {
        meterId: selectedMeterId,
        totalKwh: Number(values.totalKwh),
        readingDate: values.readingDate || undefined,
        notes: values.notes || null,
        evidenceImageUrl: values.evidenceImageUrl || null,
      };
      const { data } = await callables.createManualReading(payload);
      toast.success(
        `Relevé enregistré — consommation ${data?.reading?.consumptionKwh ?? 0} kWh.`,
      );
      reset({ totalKwh: '', readingDate: '', notes: '', evidenceImageUrl: '' });
      // Retour à la fiche du compteur.
      navigate(`/meters/${selectedMeterId}`, { replace: true });
    } catch (err) {
      const { message } = callableError(err);
      toast.error(message);
    }
  };

  const lastIndex = activeMeter?.lastTotalKwh ?? null;

  return (
    <AppShell title="Nouveau relevé" showBack>
      <PageHeader
        title="Nouveau relevé"
        subtitle={activeMeter ? `${activeMeter.name} · dernier index ${lastIndex ?? '—'}` : 'Sélectionnez un compteur'}
      />

      {!presetMeterId && presetShopId && !shopMeters?.length ? (
        <EmptyState title="Aucun compteur pour cette boutique" />
      ) : !presetMeterId && !presetShopId ? (
        <EmptyState
          title="Sélectionnez un compteur"
          description="Ouvrez la fiche d'un compteur pour créer un relevé, ou passez par la boutique."
        />
      ) : (
        <MobileFormLayout
          footer={
            <Button type="submit" size="lg" loading={isSubmitting} disabled={!canSubmit} form="reading-form">
              <Save size={18} /> Enregistrer le relevé
            </Button>
          }
        >
          <form id="reading-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {!presetMeterId && availableMeters.length > 1 && (
              <label className="block">
                <span className="text-sm font-medium mb-1.5 block">Compteur</span>
                <select
                  value={selectedMeterId}
                  onChange={(e) => setSelectedMeterId(e.target.value)}
                  className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]"
                >
                  <option value="">— Sélectionner —</option>
                  {availableMeters.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.code})
                    </option>
                  ))}
                </select>
              </label>
            )}

            {activeMeter && (
              <div className="rounded-xl bg-muted-light border border-[var(--c-border)] p-3 text-sm">
                <p className="text-[var(--c-text-muted)]">Dernier index valide</p>
                <p className="font-semibold">
                  {formatKwh(activeMeter.lastTotalKwh, { withUnit: true })}
                </p>
                <p className="text-xs text-[var(--c-text-muted)] mt-1">
                  La consommation sera calculée automatiquement. Un index inférieur sera refusé.
                </p>
              </div>
            )}

            <Input
              label="Nouvel index (kWh)"
              type="number"
              step="0.001"
              inputMode="decimal"
              enterKeyHint="next"
              error={errors.totalKwh?.message}
              {...register('totalKwh')}
            />
            <Input
              label="Date du relevé"
              type="datetime-local"
              hint="Laisser vide pour utiliser la date actuelle."
              error={errors.readingDate?.message}
              {...register('readingDate')}
            />
            <Input
              label="Notes (facultatif)"
              error={errors.notes?.message}
              {...register('notes')}
            />
          </form>
        </MobileFormLayout>
      )}
    </AppShell>
  );
}