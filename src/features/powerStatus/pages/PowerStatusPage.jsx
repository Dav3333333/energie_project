import { useState } from 'react';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PowerStatusBadge from '@/components/common/PowerStatusBadge';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import BottomSheet from '@/components/mobile/BottomSheet';
import Input from '@/components/ui/Input';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGallery } from '@/features/galleries/hooks/useGalleries';
import { useShopsByGallery } from '@/features/shops/hooks/useShops';
import { usePowerEvents } from '../hooks/usePowerEvents';
import { callables, callableError } from '@/lib/firebase/callables';
import { formatDateTime } from '@/lib/formatters';
import { ROLES } from '@/constants/roles';

const STATUS_LABEL = {
  AVAILABLE: 'Disponible',
  OUTAGE: 'Coupure',
  UNSTABLE: 'Instable',
  UNKNOWN: 'Inconnu',
};

const SOURCE_LABEL = {
  GRID: 'Réseau',
  GENERATOR: 'Groupe',
  SOLAR: 'Solaire',
  BATTERY: 'Batterie',
  UNKNOWN: 'Inconnu',
};

export default function PowerStatusPage() {
  const { profile, galleryIds } = useAuth();
  const galleryId = galleryIds?.[0];
  const { data: gallery } = useGallery(galleryId);
  const { data: shops } = useShopsByGallery(galleryId, { status: 'ACTIVE' });
  const { data: events, isLoading } = usePowerEvents(galleryId, { pageSize: 30 });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [target, setTarget] = useState({ scope: 'GALLERY', shopId: null });
  const [form, setForm] = useState({ powerStatus: 'AVAILABLE', energySource: 'GRID', description: '' });
  const [saving, setSaving] = useState(false);

  const canDeclare = [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN, ROLES.TECHNICIAN].includes(profile?.role);

  const openSheet = (scope, shopId = null) => {
    setTarget({ scope, shopId });
    setForm({ powerStatus: 'AVAILABLE', energySource: 'GRID', description: '' });
    setSheetOpen(true);
  };

  const onSubmit = async () => {
    setSaving(true);
    try {
      await callables.createManualPowerEvent({
        galleryId,
        shopId: target.scope === 'SHOP' ? target.shopId : null,
        powerStatus: form.powerStatus,
        energySource: form.energySource,
        description: form.description || null,
      });
      toast.success('État déclaré.');
      setSheetOpen(false);
    } catch (err) {
      toast.error(callableError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="État du courant">
      <PageHeader title="État du courant" subtitle="Déclaration manuelle" />

      <section className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--c-text-muted)]">Galerie</p>
            <p className="font-semibold">{gallery?.name ?? '—'}</p>
          </div>
          <PowerStatusBadge status={gallery?.mainPowerStatus} />
        </div>
        {canDeclare && (
          <Button
            className="mt-3"
            variant="outline"
            size="md"
            onClick={() => openSheet('GALLERY')}
          >
            <Zap size={16} /> Déclarer l&apos;état principal
          </Button>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-semibold mb-3">Par boutique</h2>
        {shops?.length ? (
          <ul className="space-y-2">
            {shops.map((s) => (
              <li
                key={s.id}
                className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-3 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-xs text-[var(--c-text-muted)]">{s.code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <PowerStatusBadge status={s.currentPowerStatus} />
                  {canDeclare && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openSheet('SHOP', s.id)}
                    >
                      Déclarer
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Aucune boutique" />
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-semibold mb-3">Historique récent</h2>
        {isLoading ? (
          <LoadingState />
        ) : events?.length ? (
          <ul className="space-y-2">
            {events.slice(0, 15).map((e) => (
              <li
                key={e.id}
                className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-3 text-sm"
              >
                <div className="flex justify-between">
                  <span className="font-medium">
                    {e.scope === 'GALLERY' ? 'Galerie' : 'Boutique'} · {STATUS_LABEL[e.powerStatus]}
                  </span>
                  <span className="text-xs text-[var(--c-text-muted)]">
                    {formatDateTime(e.declaredAt)}
                  </span>
                </div>
                <p className="text-xs text-[var(--c-text-muted)] mt-1">
                  Source : {SOURCE_LABEL[e.energySource] ?? e.energySource}
                  {e.description ? ` · ${e.description}` : ''}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Aucun événement" />
        )}
      </section>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={target.scope === 'GALLERY' ? 'Déclarer l\'état principal' : 'Déclarer l\'état boutique'}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">État</span>
            <select
              value={form.powerStatus}
              onChange={(e) => setForm({ ...form, powerStatus: e.target.value })}
              className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]"
            >
              <option value="AVAILABLE">Disponible</option>
              <option value="OUTAGE">Coupure</option>
              <option value="UNSTABLE">Instable</option>
              <option value="UNKNOWN">Inconnu</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Source d&apos;énergie</span>
            <select
              value={form.energySource}
              onChange={(e) => setForm({ ...form, energySource: e.target.value })}
              className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]"
            >
              <option value="GRID">Réseau</option>
              <option value="GENERATOR">Groupe</option>
              <option value="SOLAR">Solaire</option>
              <option value="BATTERY">Batterie</option>
              <option value="UNKNOWN">Inconnu</option>
            </select>
          </label>
          <Input
            label="Description (facultatif)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Button size="lg" onClick={onSubmit} loading={saving}>
            Confirmer
          </Button>
        </div>
      </BottomSheet>
    </AppShell>
  );
}