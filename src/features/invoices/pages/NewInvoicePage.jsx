import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MobileFormLayout from '@/components/forms/MobileFormLayout';
import { invoiceGenerateSchema } from '../schemas/invoiceSchemas';
import { callables, callableError } from '@/lib/firebase/callables';
import { useMetersAcrossScope } from '@/features/meters/hooks/useMeters';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLES } from '@/constants/roles';

export default function NewInvoicePage() {
  const navigate = useNavigate();
  const { profile, galleryIds = [] } = useAuth();
  const canGenerate = [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(profile?.role);
  const scope = profile?.role === ROLES.SUPER_ADMIN ? null : galleryIds;
  const { data: meters = [] } = useMetersAcrossScope(scope, { status: 'ACTIVE' });
  const availableMeters = useMemo(() => meters.filter((meter) => meter.status === 'ACTIVE'), [meters]);
  const [meterId, setMeterId] = useState('');
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const toIso = (date) => date.toISOString().slice(0, 10);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(invoiceGenerateSchema),
    defaultValues: { type: 'STATEMENT', periodStart: toIso(firstDay), periodEnd: toIso(today) },
  });

  useEffect(() => {
    if (!availableMeters.some((meter) => meter.id === meterId)) setMeterId(availableMeters[0]?.id ?? '');
  }, [availableMeters, meterId]);

  const onSubmit = async (values) => {
    if (!canGenerate || !meterId) {
      toast.error('Sélectionnez un compteur accessible.');
      return;
    }
    try {
      const { data } = await callables.generateInvoice({ meterId, type: values.type, periodStart: values.periodStart, periodEnd: values.periodEnd });
      toast.success(`Facture ${data.invoice.invoiceNumber} générée.`);
      navigate(`/invoices/${data.invoice.id}`, { replace: true });
    } catch (err) {
      toast.error(callableError(err).message);
    }
  };

  if (!canGenerate) return <AppShell title="Générer une facture"><PageHeader title="Accès réservé aux administrateurs" /></AppShell>;

  return (
    <AppShell title="Générer une facture" showBack>
      <PageHeader title="Générer une facture" subtitle="Les achats et relevés du compteur sélectionné seront inclus." />
      <MobileFormLayout footer={<Button type="submit" size="lg" form="invoice-form" loading={isSubmitting}><FileText size={18} /> Générer</Button>}>
        <form id="invoice-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Compteur à facturer</span>
            <select value={meterId} onChange={(event) => setMeterId(event.target.value)} className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]">
              <option value="">Sélectionner un compteur</option>
              {availableMeters.map((meter) => <option key={meter.id} value={meter.id}>{meter.name} · {meter.code} ({meter.type === 'MAIN' ? 'Galerie' : 'Boutique'})</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Type</span>
            <select {...register('type')} className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]">
              <option value="STATEMENT">Relevé de compte</option><option value="INVOICE">Facture</option>
            </select>
          </label>
          <Input label="Début de période" type="date" error={errors.periodStart?.message} {...register('periodStart')} />
          <Input label="Fin de période" type="date" error={errors.periodEnd?.message} {...register('periodEnd')} />
        </form>
      </MobileFormLayout>
    </AppShell>
  );
}
