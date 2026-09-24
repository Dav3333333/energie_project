import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import Button from '@/components/ui/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from 'sonner';
import { useGallery } from '@/features/galleries/hooks/useGalleries';
import { callables, callableError } from '@/lib/firebase/callables';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '@/components/ui/Input';
import { ROLES } from '@/constants/roles';
import { useState } from 'react';

const schema = z.object({
  lowCreditThresholdKwh: z.coerce.number().nonnegative(),
  criticalCreditThresholdKwh: z.coerce.number().nonnegative(),
  defaultPricePerKwh: z.coerce.number().nonnegative(),
});

export default function SettingsPage() {
  const { profile, galleryIds } = useAuth();
  const galleryId = galleryIds?.[0];
  const { data: gallery } = useGallery(galleryId);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    values: gallery
      ? {
          lowCreditThresholdKwh: gallery.lowCreditThresholdKwh ?? 50,
          criticalCreditThresholdKwh: gallery.criticalCreditThresholdKwh ?? 10,
          defaultPricePerKwh: gallery.defaultPricePerKwh ?? 0,
        }
      : undefined,
  });

  const canEdit = [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(profile?.role);

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      await callables.updateGallery({ galleryId, patch: values });
      toast.success('Paramètres enregistrés.');
    } catch (err) {
      toast.error(callableError(err).message);
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <AppShell title="Paramètres">
        <PageHeader title="Paramètres" subtitle="Accès restreint" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Paramètres">
      <PageHeader title="Paramètres" subtitle={gallery?.name} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <Input
          label="Prix kWh par défaut"
          type="number"
          step="0.01"
          inputMode="decimal"
          error={errors.defaultPricePerKwh?.message}
          {...register('defaultPricePerKwh')}
        />
        <Input
          label="Seuil crédit faible (kWh)"
          type="number"
          step="0.1"
          inputMode="decimal"
          error={errors.lowCreditThresholdKwh?.message}
          {...register('lowCreditThresholdKwh')}
        />
        <Input
          label="Seuil critique (kWh)"
          type="number"
          step="0.1"
          inputMode="decimal"
          error={errors.criticalCreditThresholdKwh?.message}
          {...register('criticalCreditThresholdKwh')}
        />
        <Button type="submit" size="lg" loading={saving}>
          Enregistrer
        </Button>
      </form>
    </AppShell>
  );
}