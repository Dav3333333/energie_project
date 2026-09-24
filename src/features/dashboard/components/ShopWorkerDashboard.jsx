import StatusBadge from '@/components/common/StatusBadge';
import PowerStatusBadge from '@/components/common/PowerStatusBadge';
import CreditBalanceCard from '@/components/common/CreditBalanceCard';
import EmptyState from '@/components/common/EmptyState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useShopsByIds } from '@/features/shops/hooks/useShops';
import { useAlertsByShop } from '@/features/alerts/hooks/useAlerts';
import { formatDateTime } from '@/lib/formatters';

/**
 * Vue travailleur : informations limitées, sans montants financiers complets.
 */
export default function ShopWorkerDashboard() {
  const { shopIds } = useAuth();
  const { data: shops } = useShopsByIds(shopIds ?? []);
  const shop = shops?.[0];
  const { data: alerts } = useAlertsByShop(shop?.id, { status: 'OPEN' });

  if (!shop) return <EmptyState title="Aucune boutique associée" />;

  return (
    <>
      <div className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-4 shadow-card">
        <div className="flex justify-between items-center">
          <p className="font-semibold">{shop.name}</p>
          <PowerStatusBadge status={shop.currentPowerStatus} />
        </div>
      </div>

      <CreditBalanceCard shop={shop} />

      <section>
        <h2 className="font-semibold mb-3">Alertes</h2>
        {alerts?.length ? (
          <ul className="space-y-2">
            {alerts.slice(0, 5).map((a) => (
              <li key={a.id} className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-3 text-sm">
                <div className="flex justify-between">
                  <p className="font-medium">{a.title}</p>
                  <StatusBadge status={a.severity} />
                </div>
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