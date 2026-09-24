import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MobileFormLayout from '@/components/forms/MobileFormLayout';
import { shopCreateSchema } from '../schemas/shopSchemas';
import { callables, callableError } from '@/lib/firebase/callables';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGalleries } from '@/features/galleries/hooks/useGalleries';
import { ROLES } from '@/constants/roles';

export default function NewShopPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { galleryIds, profile } = useAuth();
  const requestedGalleryId = params.get('galleryId');
  const defaultGalleryId = requestedGalleryId ?? galleryIds?.[0] ?? '';
  const [selectedGalleryId, setSelectedGalleryId] = useState(defaultGalleryId);
  const { data: galleries } = useGalleries();
  const galleryId = selectedGalleryId;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(shopCreateSchema),
    defaultValues: { galleryId },
  });

  const onSubmit = async (values) => {
    if (!galleryId) {
      toast.error('Sélectionnez une galerie.');
      return;
    }
    try {
      const payload = {
        ...values,
        galleryId,
        description: values.description || null,
        location: values.location || null,
        customPricePerKwh: values.customPricePerKwh ?? null,
        lowCreditThresholdKwh: values.lowCreditThresholdKwh ?? null,
        criticalCreditThresholdKwh: values.criticalCreditThresholdKwh ?? null,
      };
      const { data } = await callables.createShop(payload);
      toast.success('Boutique créée.');
      navigate(`/shops/${data.shop.id}`, { replace: true });
    } catch (err) {
      toast.error(callableError(err).message);
    }
  };

  return (
    <AppShell title="Nouvelle boutique" showBack>
      <PageHeader title="Nouvelle boutique" />
      <MobileFormLayout
        footer={
          <Button type="submit" size="lg" form="shop-form" loading={isSubmitting}>
            Créer la boutique
          </Button>
        }
      >
        <form id="shop-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {profile?.role === ROLES.SUPER_ADMIN && !requestedGalleryId && (
            <label className="block">
              <span className="text-sm font-medium mb-1.5 block">Galerie</span>
              <select
                value={selectedGalleryId}
                onChange={(event) => setSelectedGalleryId(event.target.value)}
                className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]"
              >
                <option value="">— Sélectionner une galerie —</option>
                {(galleries ?? []).map((gallery) => (
                  <option key={gallery.id} value={gallery.id}>
                    {gallery.name} ({gallery.code})
                  </option>
                ))}
              </select>
              {!galleryId && <p className="text-xs text-danger mt-1">Sélectionnez une galerie.</p>}
            </label>
          )}
          <Input label="Nom" error={errors.name?.message} {...register('name')} />
          <Input label="Code" error={errors.code?.message} {...register('code')} />
          <Input label="Emplacement" error={errors.location?.message} {...register('location')} />
          <Input label="Description" error={errors.description?.message} {...register('description')} />
          <Input
            label="Prix kWh personnalisé (optionnel)"
            type="number"
            step="0.01"
            inputMode="decimal"
            error={errors.customPricePerKwh?.message}
            {...register('customPricePerKwh')}
          />
          <Input
            label="Seuil crédit faible (optionnel)"
            type="number"
            step="0.01"
            inputMode="decimal"
            error={errors.lowCreditThresholdKwh?.message}
            {...register('lowCreditThresholdKwh')}
          />
          <Input
            label="Seuil critique (optionnel)"
            type="number"
            step="0.01"
            inputMode="decimal"
            error={errors.criticalCreditThresholdKwh?.message}
            {...register('criticalCreditThresholdKwh')}
          />
        </form>
      </MobileFormLayout>
    </AppShell>
  );
}