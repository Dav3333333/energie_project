import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MobileFormLayout from '@/components/forms/MobileFormLayout';
import { invoiceGenerateSchema } from '../schemas/invoiceSchemas';
import { callables, callableError } from '@/lib/firebase/callables';

export default function NewInvoicePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const shopId = params.get('shopId') ?? '';

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const toIso = (d) => d.toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(invoiceGenerateSchema),
    defaultValues: {
      shopId,
      type: 'STATEMENT',
      periodStart: toIso(firstDay),
      periodEnd: toIso(today),
    },
  });

  const onSubmit = async (values) => {
    if (!shopId) {
      toast.error('Boutique non spécifiée.');
      return;
    }
    try {
      const { data } = await callables.generateInvoice({
        shopId,
        type: values.type,
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
      });
      toast.success(`Facture ${data.invoice.invoiceNumber} générée.`);
      navigate(`/invoices/${data.invoice.id}`, { replace: true });
    } catch (err) {
      toast.error(callableError(err).message);
    }
  };

  return (
    <AppShell title="Générer une facture" showBack>
      <PageHeader title="Générer une facture" />
      <MobileFormLayout
        footer={
          <Button type="submit" size="lg" form="invoice-form" loading={isSubmitting}>
            <FileText size={18} /> Générer
          </Button>
        }
      >
        <form id="invoice-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Type</span>
            <select
              {...register('type')}
              className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]"
            >
              <option value="STATEMENT">Relevé de compte</option>
              <option value="INVOICE">Facture</option>
            </select>
          </label>
          <Input
            label="Début de période"
            type="date"
            error={errors.periodStart?.message}
            {...register('periodStart')}
          />
          <Input
            label="Fin de période"
            type="date"
            error={errors.periodEnd?.message}
            {...register('periodEnd')}
          />
        </form>
      </MobileFormLayout>
    </AppShell>
  );
}