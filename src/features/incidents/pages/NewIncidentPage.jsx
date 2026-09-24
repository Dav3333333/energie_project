import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MobileFormLayout from '@/components/forms/MobileFormLayout';
import { incidentCreateSchema } from '../schemas/incidentSchemas';
import { callables, callableError } from '@/lib/firebase/callables';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function NewIncidentPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { galleryIds } = useAuth();
  const shopId = params.get('shopId') ?? null;
  const galleryId = params.get('galleryId') ?? galleryIds?.[0] ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(incidentCreateSchema),
    defaultValues: {
      galleryId,
      shopId,
      category: 'OTHER',
      priority: 'MEDIUM',
    },
  });

  const onSubmit = async (values) => {
    try {
      const payload = {
        galleryId,
        shopId,
        title: values.title,
        description: values.description,
        category: values.category,
        priority: values.priority,
        assignedToUserId: values.assignedToUserId || null,
      };
      const { data } = await callables.createIncident(payload);
      toast.success('Incident créé.');
      navigate(`/incidents/${data.incident.id}`, { replace: true });
    } catch (err) {
      toast.error(callableError(err).message);
    }
  };

  return (
    <AppShell title="Nouvel incident" showBack>
      <PageHeader title="Nouvel incident" />
      <MobileFormLayout
        footer={
          <Button type="submit" size="lg" form="incident-form" loading={isSubmitting}>
            Créer l&apos;incident
          </Button>
        }
      >
        <form id="incident-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input label="Titre" error={errors.title?.message} {...register('title')} />
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              rows={5}
              {...register('description')}
              className="w-full px-3 py-2 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] focus:border-brand-500 focus:outline-none"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-danger">{errors.description.message}</p>
            )}
          </div>
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Catégorie</span>
            <select
              {...register('category')}
              className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]"
            >
              <option value="METER">Compteur</option>
              <option value="POWER">Alimentation</option>
              <option value="BILLING">Facturation</option>
              <option value="OTHER">Autre</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Priorité</span>
            <select
              {...register('priority')}
              className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]"
            >
              <option value="LOW">Faible</option>
              <option value="MEDIUM">Moyenne</option>
              <option value="HIGH">Haute</option>
              <option value="CRITICAL">Critique</option>
            </select>
          </label>
        </form>
      </MobileFormLayout>
    </AppShell>
  );
}