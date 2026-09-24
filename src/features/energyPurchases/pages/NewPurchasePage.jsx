import { useEffect } from 'react';
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
import { purchaseCreateSchema } from '../schemas/purchaseSchemas';
import { callables, callableError } from '@/lib/firebase/callables';
import { useShop } from '@/features/shops/hooks/useShops';

export default function NewPurchasePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const shopId = params.get('shopId') ?? '';

  const { data: shop } = useShop(shopId);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(purchaseCreateSchema),
    defaultValues: {
      shopId,
      paymentMethod: 'CASH',
    },
  });

  // Pré-remplir le prix depuis la boutique.
  useEffect(() => {
    if (shop) {
      const price = shop.customPricePerKwh ?? shop.activePricePerKwh;
      if (price != null) setValue('pricePerKwh', price);
    }
  }, [shop, setValue]);

  const onSubmit = async (values) => {
    if (!shopId) {
      toast.error('Boutique non spécifiée.');
      return;
    }
    try {
      const payload = {
        shopId,
        purchasedKwh: Number(values.purchasedKwh),
        pricePerKwh: values.pricePerKwh != null ? Number(values.pricePerKwh) : undefined,
        currency: values.currency,
        paymentMethod: values.paymentMethod,
        paymentReference: values.paymentReference || null,
        purchaseDate: values.purchaseDate || undefined,
        receiptFileUrl: values.receiptFileUrl || null,
      };
      const { data } = await callables.createEnergyPurchase(payload);
      toast.success(
        `Achat enregistré (${data.purchase.receiptNumber}) — ${data.purchase.purchasedKwh} kWh.`,
      );
      navigate(`/energy-purchases/${data.purchase.id}`, { replace: true });
    } catch (err) {
      toast.error(callableError(err).message);
    }
  };

  if (!shopId) {
    return (
      <AppShell title="Nouvel achat" showBack>
        <PageHeader title="Nouvel achat" subtitle="Boutique non spécifiée" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Nouvel achat" showBack>
      <PageHeader
        title="Nouvel achat kWh"
        subtitle={shop ? `${shop.name} · ${shop.code}` : ''}
      />

      <MobileFormLayout
        footer={
          <Button type="submit" size="lg" form="purchase-form" loading={isSubmitting}>
            <Save size={18} /> Enregistrer l&apos;achat
          </Button>
        }
      >
        <form id="purchase-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Quantité achetée (kWh)"
            type="number"
            step="0.001"
            inputMode="decimal"
            enterKeyHint="next"
            error={errors.purchasedKwh?.message}
            {...register('purchasedKwh')}
          />
          <Input
            label="Prix par kWh"
            type="number"
            step="0.0001"
            inputMode="decimal"
            hint="Laisser vide pour utiliser le prix actif de la boutique."
            error={errors.pricePerKwh?.message}
            {...register('pricePerKwh')}
          />
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Devise</span>
            <select
              {...register('currency')}
              defaultValue={shop?.currency ?? 'USD'}
              className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]"
            >
              <option value="USD">USD</option>
              <option value="CDF">CDF</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Mode de paiement</span>
            <select
              {...register('paymentMethod')}
              className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]"
            >
              <option value="CASH">Espèces</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="BANK">Banque</option>
              <option value="OTHER">Autre</option>
            </select>
          </label>
          <Input
            label="Référence de paiement"
            hint="Numéro de transaction, bordereau… (facultatif)"
            error={errors.paymentReference?.message}
            {...register('paymentReference')}
          />
          <Input
            label="Date d'achat"
            type="datetime-local"
            hint="Laisser vide pour maintenant."
            error={errors.purchaseDate?.message}
            {...register('purchaseDate')}
          />
        </form>
      </MobileFormLayout>
    </AppShell>
  );
}