import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MobileFormLayout from '@/components/forms/MobileFormLayout';
import { meterCreateSchema } from '../schemas/meterSchemas';
import { callables, callableError } from '@/lib/firebase/callables';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGalleries } from '@/features/galleries/hooks/useGalleries';
import { useShop, useShopsByGallery } from '@/features/shops/hooks/useShops';
import { useMetersByGallery } from '../hooks/useMeters';
import { ROLES } from '@/constants/roles';

export default function NewMeterPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const shopId = params.get('shopId') ?? '';
  const requestedGalleryId = params.get('galleryId') ?? '';
  const isGeneralMeter = !shopId && params.get('type') === 'MAIN';
  const { profile, galleryIds = [] } = useAuth();
  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(profile?.role);
  const { data: allGalleries = [], isLoading: galleriesLoading } = useGalleries({ status: 'ACTIVE' });
  const galleries = useMemo(() => (profile?.role === ROLES.SUPER_ADMIN
    ? allGalleries
    : allGalleries.filter((gallery) => galleryIds.includes(gallery.id))), [allGalleries, profile?.role, galleryIds]);
  const { data: linkedShop, isLoading: shopLoading } = useShop(shopId);

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(meterCreateSchema),
    defaultValues: { galleryId: requestedGalleryId, shopId, type: shopId ? 'SUB_METER' : 'MAIN', parentMeterId: '', initialKwh: 0 },
  });
  const type = useWatch({ control, name: 'type' });
  const selectedGalleryId = useWatch({ control, name: 'galleryId' });
  const { data: shops = [] } = useShopsByGallery(selectedGalleryId, { status: 'ACTIVE' });
  const { data: mainMeters = [] } = useMetersByGallery(selectedGalleryId, { type: 'MAIN', status: 'ACTIVE' });

  useEffect(() => {
    if (requestedGalleryId) {
      setValue('galleryId', requestedGalleryId, { shouldValidate: true });
      if (isGeneralMeter) setValue('type', 'MAIN');
    } else if (shopId && linkedShop?.galleryId) {
      setValue('galleryId', linkedShop.galleryId, { shouldValidate: true });
      setValue('type', 'SUB_METER');
    } else if (!selectedGalleryId && galleries.length) {
      setValue('galleryId', galleries[0].id, { shouldValidate: true });
    }
  }, [requestedGalleryId, isGeneralMeter, shopId, linkedShop?.galleryId, galleries, selectedGalleryId, setValue]);

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        galleryCode: galleries.find((gallery) => gallery.id === values.galleryId)?.code,
        shopId: values.type === 'SUB_METER' ? (shopId || values.shopId) : null,
        parentMeterId: values.type === 'SUB_METER' ? (values.parentMeterId || null) : null,
        serialNumber: values.serialNumber || null,
        description: values.description || null,
        initialKwh: Number(values.initialKwh ?? 0),
      };
      const { data } = await callables.createMeter(payload);
      toast.success('Compteur créé.');
      navigate(`/meters/${data.meter.id}`, { replace: true });
    } catch (err) {
      toast.error(callableError(err).message);
    }
  };

  if (!isAdmin) return <AppShell title="Nouveau compteur"><PageHeader title="Accès refusé" subtitle="Seuls les administrateurs peuvent créer un compteur." /></AppShell>;
  if (shopId && shopLoading) return <AppShell title="Nouveau compteur"><PageHeader title="Chargement de la boutique…" /></AppShell>;
  if (shopId && !linkedShop) return <AppShell title="Nouveau compteur"><PageHeader title="Boutique introuvable" /></AppShell>;
  if (!galleriesLoading && !galleries.length) return <AppShell title="Nouveau compteur"><PageHeader title="Aucune galerie accessible" /></AppShell>;

  return (
    <AppShell title="Nouveau compteur" showBack>
      <PageHeader title="Nouveau compteur" subtitle="Le code sera généré automatiquement." />
      <MobileFormLayout footer={<Button type="submit" size="lg" form="meter-form" loading={isSubmitting}>Créer le compteur</Button>}>
        <form id="meter-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Galerie</span>
            <select {...register('galleryId')} disabled={Boolean(shopId || requestedGalleryId)} className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]">
              <option value="">Sélectionner une galerie</option>
              {galleries.map((gallery) => <option key={gallery.id} value={gallery.id}>{gallery.name}</option>)}
            </select>
            {errors.galleryId && <span className="text-xs text-red-600">{errors.galleryId.message}</span>}
          </label>
          {!shopId && !isGeneralMeter && (
            <label className="block">
              <span className="text-sm font-medium mb-1.5 block">Type</span>
              <select {...register('type')} className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]">
                <option value="MAIN">Compteur général de galerie</option>
                <option value="SUB_METER">Sous-compteur de boutique</option>
              </select>
            </label>
          )}
          {isGeneralMeter && <p className="text-sm text-[var(--c-text-muted)]">Compteur général de la galerie sélectionnée.</p>}
          {type === 'SUB_METER' && !shopId && (
            <label className="block">
              <span className="text-sm font-medium mb-1.5 block">Boutique</span>
              <select {...register('shopId')} className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]">
                <option value="">Sélectionner une boutique</option>
                {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
              </select>
              {errors.shopId && <span className="text-xs text-red-600">{errors.shopId.message}</span>}
            </label>
          )}
          {type === 'SUB_METER' && (
            <label className="block">
              <span className="text-sm font-medium mb-1.5 block">Compteur général parent (facultatif)</span>
              <select {...register('parentMeterId')} className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]">
                <option value="">Aucun</option>
                {mainMeters.map((meter) => <option key={meter.id} value={meter.id}>{meter.name} · {meter.code}</option>)}
              </select>
            </label>
          )}
          {shopId && <p className="text-sm text-[var(--c-text-muted)]">Boutique : {linkedShop?.name}</p>}
          <Input label="Nom" error={errors.name?.message} {...register('name')} />
          <Input label="N° de série" error={errors.serialNumber?.message} {...register('serialNumber')} />
          <Input label="Description" error={errors.description?.message} {...register('description')} />
          <Input label="Index initial (kWh)" type="number" step="0.001" inputMode="decimal" error={errors.initialKwh?.message} {...register('initialKwh')} />
        </form>
      </MobileFormLayout>
    </AppShell>
  );
}
