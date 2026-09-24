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

export default function NewShopPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { galleryIds } = useAuth();
  const galleryId = params.get('galleryId') ?? galleryIds?.[0] ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(shopCreateSchema),
    defaultValues: { galleryId },
  });

  const onSubmit = async (values) => {
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