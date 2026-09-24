import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus, Wrench } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/common/EmptyState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAlertsByGallery } from '@/features/alerts/hooks/useAlerts';
import { useMetersByGallery } from '@/features/meters/hooks/useMeters';

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const { galleryIds } = useAuth();
  const galleryId = galleryIds?.[0];
  const { data: alerts } = useAlertsByGallery(galleryId, { status: 'OPEN' });
  const { data: meters } = useMetersByGallery(galleryId, { status: 'ACTIVE' });

  const staleMeters = (meters ?? []).filter((m) => {
    if (!m.lastReadingAt) return true;
    const last = m.lastReadingAt.toDate ? m.lastReadingAt.toDate() : new Date(m.lastReadingAt);
    return Date.now() - last.getTime() > 30 * 24 * 3600 * 1000;
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Alertes ouvertes" value={alerts?.length ?? 0} tone="warning" icon={<AlertTriangle size={16} />} />
        <StatCard label="Relevés en retard" value={staleMeters.length} tone={staleMeters.length ? 'danger' : 'default'} />
      </div>

      <section>
        <h2 className="font-semibold mb-3">Actions rapides</h2>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="md" onClick={() => navigate('/readings/new')}>
            <Plus size={16} /> Relevé
          </Button>
          <Button variant="outline" size="md" onClick={() => navigate('/incidents')}>
            <Wrench size={16} /> Incident
          </Button>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Compteurs à relever</h2>
        {staleMeters.length ? (
          <ul className="space-y-2">
            {staleMeters.slice(0, 8).map((m) => (
              <li
                key={m.id}
                className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-3 flex justify-between"
              >
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-[var(--c-text-muted)]">{m.code}</p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate(`/readings/new?meterId=${m.id}`)}
                >
                  Relever
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Aucun compteur à relever" />
        )}
      </section>
    </>
  );
}