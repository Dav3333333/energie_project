import { useNavigate } from 'react-router-dom';
import { Plus, Receipt } from 'lucide-react';
import Button from '@/components/ui/Button';
import CreditBalanceCard from '@/components/common/CreditBalanceCard';
import PowerStatusBadge from '@/components/common/PowerStatusBadge';
import EmptyState from '@/components/common/EmptyState';
import TouchCard from '@/components/mobile/TouchCard';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useShopsByIds } from '@/features/shops/hooks/useShops';
import { useAlertsByShop } from '@/features/alerts/hooks/useAlerts';
import { formatDateTime, formatCurrency } from '@/lib/formatters';

export default function ShopOwnerDashboard() {
  const { shopIds } = useAuth();
  const navigate = useNavigate();
  const { data: shops } = useShopsByIds(shopIds ?? []);
  const primaryShop = shops?.[0];
  const { data: alerts } = useAlertsByShop(primaryShop?.id, { status: 'OPEN' });

  if (!shops?.length) {
    return <EmptyState title="Aucune boutique associée" />;
  }

  return (
    <>
      {primaryShop && (
        <>
          <div className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{primaryShop.name}</p>
              <PowerStatusBadge status={primaryShop.currentPowerStatus} />
            </div>
          </div>

          <CreditBalanceCard shop={primaryShop} />

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="md" onClick={() => navigate(`/energy-purchases/new?shopId=${primaryShop.id}`)}>
              <Plus size={16} /> Achat kWh
            </Button>
            <Button variant="outline" size="md" onClick={() => navigate('/invoices')}>
              <Receipt size={16} /> Factures
            </Button>
          </div>
        </>
      )}

      {shops.length > 1 && (
        <section>
          <h2 className="font-semibold mb-3">Autres boutiques</h2>
          <div className="space-y-2">
            {shops.slice(1).map((s) => (
              <Link key={s.id} to={`/shops/${s.id}`} className="block">
                <TouchCard interactive title={s.name} subtitle={`Reste ${s.remainingKwh ?? 0} kWh`} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-3">Alertes</h2>
        {alerts?.length ? (
          <ul className="space-y-2">
            {alerts.slice(0, 5).map((a) => (
              <li key={a.id} className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-3 text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-[var(--c-text-muted)] mt-1">{a.message}</p>
                <p className="text-xs text-[var(--c-text-muted)] mt-1">{formatDateTime(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Aucune alerte" />
        )}
      </section>
    </>
  );
}