import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MobileFormLayout from '@/components/forms/MobileFormLayout';
import { purchaseCreateSchema } from '../schemas/purchaseSchemas';
import { callables, callableError } from '@/lib/firebase/callables';
import { useShop, useShopsByGallery } from '@/features/shops/hooks/useShops';
import { useGalleries } from '@/features/galleries/hooks/useGalleries';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMetersByGallery, useMetersByShop } from '@/features/meters/hooks/useMeters';
import { ROLES } from '@/constants/roles';

const EMPTY_LIST = [];

export default function NewPurchasePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const fixedShopId = params.get('shopId') || '';
  const { profile, galleryIds } = useAuth();
  const accessibleGalleryIds = galleryIds ?? EMPTY_LIST;
  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(profile?.role);
  const [destinationType, setDestinationType] = useState(fixedShopId ? 'SHOP' : 'GALLERY');
  const [selectedGalleryId, setSelectedGalleryId] = useState(accessibleGalleryIds[0] ?? '');
  const [selectedShopId, setSelectedShopId] = useState(fixedShopId);
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const { data: allGalleriesData } = useGalleries({ status: 'ACTIVE' });
  const allGalleries = allGalleriesData ?? EMPTY_LIST;
  const galleries = useMemo(() => (profile?.role === ROLES.SUPER_ADMIN
    ? allGalleries
    : allGalleries.filter((gallery) => accessibleGalleryIds.includes(gallery.id))), [allGalleries, profile?.role, accessibleGalleryIds]);
  const { data: fixedShop } = useShop(fixedShopId);
  const { data: shopsData } = useShopsByGallery(selectedGalleryId, { status: 'ACTIVE' });
  const { data: galleryMetersData } = useMetersByGallery(selectedGalleryId, { type: 'MAIN', status: 'ACTIVE' });
  const { data: shopMetersData } = useMetersByShop(fixedShopId || selectedShopId);
  const shops = shopsData ?? EMPTY_LIST;
  const galleryMeters = galleryMetersData ?? EMPTY_LIST;
  const shopMeters = shopMetersData ?? EMPTY_LIST;
  const availableMeters = useMemo(() => (destinationType === 'GALLERY'
    ? galleryMeters.filter((meter) => meter.status === 'ACTIVE' && meter.type === 'MAIN')
    : shopMeters.filter((meter) => meter.status === 'ACTIVE')),
  [destinationType, galleryMeters, shopMeters]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(purchaseCreateSchema),
    defaultValues: { meterId: '', paymentMethod: 'CASH', currency: 'USD' },
  });
  const purchasedKwh = useWatch({ control, name: 'purchasedKwh' });
  const totalAmount = useWatch({ control, name: 'totalAmount' });
  const derivedPrice = Number(purchasedKwh) > 0 && Number(totalAmount) >= 0
    ? Number(totalAmount) / Number(purchasedKwh)
    : null;

  useEffect(() => {
    if (fixedShop && fixedShop.galleryId) {
      setSelectedGalleryId(fixedShop.galleryId);
      setDestinationType('SHOP');
    } else if (!selectedGalleryId && galleries.length) {
      setSelectedGalleryId(galleries[0].id);
    }
  }, [fixedShop, galleries, selectedGalleryId]);

  useEffect(() => {
    if (!availableMeters.some((meter) => meter.id === selectedMeterId)) {
      const defaultMeter = availableMeters.length === 1 ? availableMeters[0].id : '';
      if (selectedMeterId !== defaultMeter) setSelectedMeterId(defaultMeter);
      setValue('meterId', defaultMeter, { shouldValidate: true, shouldDirty: false });
    }
  }, [availableMeters, selectedMeterId, setValue]);

  const onSubmit = async (values) => {
    try {
      const { data } = await callables.createEnergyPurchase({
        ...values,
        purchasedKwh: Number(values.purchasedKwh),
        totalAmount: Number(values.totalAmount),
        paymentReference: values.paymentReference || null,
        purchaseDate: values.purchaseDate || undefined,
        receiptFileUrl: values.receiptFileUrl || null,
      });
      toast.success(`Achat enregistré (${data.purchase.receiptNumber}) — ${data.purchase.purchasedKwh} kWh.`);
      navigate(`/energy-purchases/${data.purchase.id}`, { replace: true });
    } catch (err) {
      toast.error(callableError(err).message);
    }
  };

  if (!isAdmin) return <AppShell title="Nouvel achat"><PageHeader title="Accès réservé aux administrateurs" /></AppShell>;
  if (!fixedShopId && !galleries.length) return <AppShell title="Nouvel achat"><PageHeader title="Aucune galerie accessible" /></AppShell>;

  return (
    <AppShell title="Nouvel achat" showBack>
      <PageHeader title="Nouvel achat kWh" subtitle="Renseignez le montant payé et les kWh reçus, puis choisissez le compteur crédité." />
      <MobileFormLayout footer={<Button type="submit" size="lg" form="purchase-form" loading={isSubmitting}><Save size={18} /> Enregistrer l&apos;achat</Button>}>
        <form id="purchase-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {!fixedShopId && (
            <>
              <label className="block">
                <span className="text-sm font-medium mb-1.5 block">Galerie</span>
                <select value={selectedGalleryId} onChange={(event) => { setSelectedGalleryId(event.target.value); setSelectedShopId(''); setSelectedMeterId(''); setValue('meterId', '', { shouldValidate: true }); }} className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]">
                  <option value="">Sélectionner une galerie</option>
                  {galleries.map((gallery) => <option key={gallery.id} value={gallery.id}>{gallery.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium mb-1.5 block">Affecter à</span>
                <select value={destinationType} onChange={(event) => { setDestinationType(event.target.value); setSelectedShopId(''); setSelectedMeterId(''); setValue('meterId', '', { shouldValidate: true }); }} className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]">
                  <option value="GALLERY">Compteur général de la galerie</option>
                  <option value="SHOP">Compteur d&apos;une boutique</option>
                </select>
              </label>
              {destinationType === 'SHOP' && (
                <label className="block">
                  <span className="text-sm font-medium mb-1.5 block">Boutique</span>
                  <select value={selectedShopId} onChange={(event) => { setSelectedShopId(event.target.value); setSelectedMeterId(''); setValue('meterId', '', { shouldValidate: true }); }} disabled={!selectedGalleryId} className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] disabled:opacity-60">
                    <option value="">Sélectionner une boutique</option>
                    {shops.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
                  </select>
                </label>
              )}
            </>
          )}
          {fixedShopId && <p className="text-sm text-[var(--c-text-muted)]">Boutique : {fixedShop?.name ?? 'Chargement…'}</p>}
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Compteur crédité</span>
            <select value={selectedMeterId} onChange={(event) => { setSelectedMeterId(event.target.value); setValue('meterId', event.target.value, { shouldValidate: true }); }} className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]">
              <option value="">Sélectionner un compteur</option>
              {availableMeters.map((meter) => <option key={meter.id} value={meter.id}>{meter.name} · {meter.code}</option>)}
            </select>
            {errors.meterId && <span className="text-xs text-red-600">{errors.meterId.message}</span>}
            {availableMeters.length === 0 && <span className="mt-1 block text-xs text-amber-700">Aucun compteur actif disponible pour cette affectation.</span>}
          </label>
          <Input label="Quantité reçue (kWh)" type="number" step="0.001" inputMode="decimal" error={errors.purchasedKwh?.message} {...register('purchasedKwh')} />
          <Input label="Montant total payé" type="number" step="0.01" inputMode="decimal" error={errors.totalAmount?.message} {...register('totalAmount')} />
          {derivedPrice != null && Number.isFinite(derivedPrice) && <p className="-mt-2 text-sm text-[var(--c-text-muted)]">Prix calculé : {derivedPrice.toFixed(4)} par kWh</p>}
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Devise</span>
            <select {...register('currency')} className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]">
              <option value="USD">USD</option><option value="CDF">CDF</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Mode de paiement</span>
            <select {...register('paymentMethod')} className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]">
              <option value="CASH">Espèces</option><option value="MOBILE_MONEY">Mobile Money</option><option value="BANK">Banque</option><option value="OTHER">Autre</option>
            </select>
          </label>
          <Input label="Référence de paiement" hint="Numéro de transaction, bordereau… (facultatif)" error={errors.paymentReference?.message} {...register('paymentReference')} />
          <Input label="Date d'achat" type="datetime-local" hint="Laisser vide pour maintenant." error={errors.purchaseDate?.message} {...register('purchaseDate')} />
        </form>
      </MobileFormLayout>
    </AppShell>
  );
}
