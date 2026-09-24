import { useNavigate } from 'react-router-dom';
import { Store, AlertTriangle, Zap, Plus } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import Button from '@/components/ui/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useShopsByGallery } from '@/features/shops/hooks/useShops';
import { useAlertsByGallery } from '@/features/alerts/hooks/useAlerts';
import { useGallery } from '@/features/galleries/hooks/useGalleries';
import PowerStatusBadge from '@/components/common/PowerStatusBadge';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import { formatKwh, formatDateTime } from '@/lib/formatters';

export default function GalleryAdminDashboard() {
  const navigate = useNavigate();
  const { galleryIds } = useAuth();
  const galleryId = galleryIds?.[0];

  const { data: gallery } = useGallery(galleryId);
  const { data: shops } = useShopsByGallery(galleryId, { status: 'ACTIVE' });
  const { data: alerts } = useAlertsByGallery(galleryId, { status: 'OPEN', pageSize: 5 });

  const lowCount = (shops ?? []).filter((s) => s.balanceStatus === 'LOW').length;
  const critCount = (shops ?? []).filter((s) => ['CRITICAL', 'EXHAUSTED'].includes(s.balanceStatus)).length;
  const totalRemaining = (shops ?? []).reduce((sum, s) => sum + (s.remainingKwh ?? 0), 0);
  const totalConsumed = (shops ?? []).reduce((sum, s) => sum + (s.totalConsumedKwh ?? 0), 0);

  return (
    <>
      {gallery && (
        <div className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-4 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-[var(--c-text-muted)]">Galerie active</p>
              <p className="font-semibold">{gallery.name}</p>
            </div>
            <PowerStatusBadge status={gallery.mainPowerStatus} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Boutiques actives" value={shops?.length ?? 0} icon={<Store size={16} />} />
        <StatCard label="Alertes" value={alerts?.length ?? 0} tone="warning" icon={<AlertTriangle size={16} />} />
        <StatCard label="Crédit faible" value={lowCount} tone={lowCount ? 'warning' : 'default'} />
        <StatCard label="Critique/épuisé" value={critCount} tone={critCount ? 'danger' : 'default'} />
        <StatCard label="Crédit restant" value={formatKwh(totalRemaining)} />
        <StatCard label="Consommé" value={formatKwh(totalConsumed)} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Raccourcis</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="md" onClick={() => navigate('/shops/new')}>
            <Plus size={16} /> Boutique
          </Button>
          <Button variant="outline" size="md" onClick={() => navigate('/energy-purchases/new?shopId=')}>
            <Plus size={16} /> Achat kWh
          </Button>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Boutiques en tension</h2>
        {(() => {
          const tension = (shops ?? []).filter((s) => ['LOW', 'CRITICAL', 'EXHAUSTED'].includes(s.balanceStatus));
          if (!tension.length) return <EmptyState title="Toutes les boutiques sont normales" />;
          return (
            <ul className="space-y-2">
              {tension.slice(0, 5).map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-[var(--c-text-muted)]">
                      Reste {formatKwh(s.remainingKwh)}
                    </p>
                  </div>
                  <StatusBadge status={s.balanceStatus} />
                </li>
              ))}
            </ul>
          );
        })()}
      </section>

      <section>
        <h2 className="font-semibold mb-3">Alertes récentes</h2>
        {alerts?.length ? (
          <ul className="space-y-2">
            {alerts.slice(0, 5).map((a) => (
              <li
                key={a.id}
                className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-3 text-sm"
              >
                <div className="flex justify-between">
                  <span className="font-medium">{a.title}</span>
                  <span className="text-xs text-[var(--c-text-muted)]">
                    {formatDateTime(a.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-[var(--c-text-muted)] mt-1">{a.message}</p>
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