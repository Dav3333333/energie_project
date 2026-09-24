import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MobileFormLayout from '@/components/forms/MobileFormLayout';
import { galleryCreateSchema } from '../schemas/gallerySchemas';
import { callables, callableError } from '@/lib/firebase/callables';

export default function NewGalleryPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(galleryCreateSchema),
    defaultValues: { currency: 'USD' },
  });

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || '',
        city: values.city || '',
        country: values.country || '',
      };
      const { data } = await callables.createGallery(payload);
      toast.success('Galerie créée.');
      navigate(`/galleries/${data.gallery.id}`, { replace: true });
    } catch (err) {
      toast.error(callableError(err).message);
    }
  };

  return (
    <AppShell title="Nouvelle galerie" showBack>
      <PageHeader title="Nouvelle galerie" />
      <MobileFormLayout
        footer={
          <Button type="submit" size="lg" form="gallery-form" loading={isSubmitting}>
            Créer la galerie
          </Button>
        }
      >
        <form id="gallery-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input label="Nom" error={errors.name?.message} {...register('name')} />
          <Input label="Code" hint="Ex. GL-01" error={errors.code?.message} {...register('code')} />
          <Input label="Adresse" error={errors.address?.message} {...register('address')} />
          <Input label="Ville" error={errors.city?.message} {...register('city')} />
          <Input label="Pays" error={errors.country?.message} {...register('country')} />
          <Input label="Téléphone" error={errors.phone?.message} {...register('phone')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Devise</span>
            <select
              {...register('currency')}
              className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]"
            >
              <option value="USD">USD</option>
              <option value="CDF">CDF</option>
            </select>
          </label>
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
        </form>
      </MobileFormLayout>
    </AppShell>
  );
}