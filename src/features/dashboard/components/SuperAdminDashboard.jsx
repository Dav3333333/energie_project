import { Building2, AlertTriangle } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import { useGalleries } from '@/features/galleries/hooks/useGalleries';
import { useAlertsByGallery } from '@/features/alerts/hooks/useAlerts';
import { formatDateTime } from '@/lib/formatters';
import EmptyState from '@/components/common/EmptyState';


import { useEffect } from 'react';
import { runCheckLowCredits } from '@/lib/services/alerts';

export default function SuperAdminDashboard() {
  useEffect(() => {
    const key = 'gem.lastCheckLowCredits';
    const last = Number(localStorage.getItem(key) ?? 0);
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - last > oneDay) {
      runCheckLowCredits()
        .then(() => localStorage.setItem(key, String(Date.now())))
        .catch((err) => console.warn('[checkLowCredits] failed', err));
    }
  }, []);

  const { data: galleries } = useGalleries();
  // Alerte globale : utilise la première galerie comme proxy MVP.
  // Vue agrégée multi-galerie : reportée (nécessite une callable d'agrégation).
  const firstGalleryId = galleries?.[0]?.id;
  const { data: alerts } = useAlertsByGallery(firstGalleryId, { status: 'OPEN', pageSize: 10 });

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Galeries" value={galleries?.length ?? 0} icon={<Building2 size={16} />} />
        <StatCard label="Alertes ouvertes" value={alerts?.length ?? 0} tone="warning" icon={<AlertTriangle size={16} />} />
      </div>

      <section>
        <h2 className="font-semibold mb-3">Dernières alertes</h2>
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
          <EmptyState title="Aucune alerte ouverte" />
        )}
      </section>
    </>
  );
}
