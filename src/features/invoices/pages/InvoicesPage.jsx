import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import Button from '@/components/ui/Button';
import TouchCard from '@/components/mobile/TouchCard';
import StatusBadge from '@/components/common/StatusBadge';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useInvoicesByGallery } from '../hooks/useInvoices';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { ROLES } from '@/constants/roles';
import { Link } from 'react-router-dom';

export default function InvoicesPage() {
  const { profile, galleryIds } = useAuth();
  const navigate = useNavigate();
  const galleryId = galleryIds?.[0];
  const { data: invoices, isLoading } = useInvoicesByGallery(galleryId);

  const canGenerate = [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(profile?.role);

  return (
    <AppShell title="Factures & relevés">
      <PageHeader
        title="Factures & relevés"
        subtitle={`${invoices?.length ?? 0} résultat(s)`}
        actions={
          canGenerate && (
            <Button size="sm" onClick={() => navigate('/invoices/new')}>
              Générer
            </Button>
          )
        }
      />

      <div className="mt-2 space-y-3">
        {isLoading ? (
          <LoadingState />
        ) : invoices?.length ? (
          invoices.map((inv) => (
            <Link key={inv.id} to={`/invoices/${inv.id}`} className="block">
              <TouchCard
                interactive
                title={`${inv.invoiceNumber} — ${formatCurrency(inv.consumedAmount, inv.currency)}`}
                subtitle={`${formatDate(inv.periodStart)} → ${formatDate(inv.periodEnd)}`}
                trailing={<StatusBadge status={inv.status} />}
              />
            </Link>
          ))
        ) : (
          <EmptyState icon={<FileText size={28} />} title="Aucune facture" />
        )}
      </div>
    </AppShell>
  );
}