import { useForm } from 'react-hook-form';
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

export default function NewMeterPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const shopId = params.get('shopId') ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(meterCreateSchema),
    defaultValues: { shopId, type: 'SUB_METER', initialKwh: 0 },
  });

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        shopId,
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

  if (!shopId) {
    return (
      <AppShell title="Nouveau compteur" showBack>
        <PageHeader title="Nouveau compteur" subtitle="shopId manquant" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Nouveau compteur" showBack>
      <PageHeader title="Nouveau compteur" />
      <MobileFormLayout
        footer={
          <Button type="submit" size="lg" form="meter-form" loading={isSubmitting}>
            Créer le compteur
          </Button>
        }
      >
        <form id="meter-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Type</span>
            <select
              {...register('type')}
              className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]"
            >
              <option value="SUB_METER">Sous-compteur</option>
              <option value="MAIN">Compteur principal</option>
            </select>
          </label>
          <Input label="Nom" error={errors.name?.message} {...register('name')} />
          <Input label="Code" error={errors.code?.message} {...register('code')} />
          <Input label="N° de série" error={errors.serialNumber?.message} {...register('serialNumber')} />
          <Input label="Description" error={errors.description?.message} {...register('description')} />
          <Input
            label="Index initial (kWh)"
            type="number"
            step="0.001"
            inputMode="decimal"
            error={errors.initialKwh?.message}
            {...register('initialKwh')}
          />
        </form>
      </MobileFormLayout>
    </AppShell>
  );
}