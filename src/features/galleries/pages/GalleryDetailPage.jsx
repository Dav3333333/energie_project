import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Gauge, Plus } from 'lucide-react';
import { Pencil } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import TouchCard from '@/components/mobile/TouchCard';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useGallery } from '../hooks/useGalleries';
import { useShopsByGallery } from '@/features/shops/hooks/useShops';
import { useMetersByGallery } from '@/features/meters/hooks/useMeters';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { formatCurrency } from '@/lib/formatters';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { callables, callableError } from '@/lib/firebase/callables';
import { galleryUpdateSchema } from '../schemas/gallerySchemas';
import { isGalleryManager } from '@/lib/permissions';

function GalleryEditForm({ gallery, onDone }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(galleryUpdateSchema),
    defaultValues: {
      name: gallery.name ?? '', address: gallery.address ?? '', city: gallery.city ?? '',
      country: gallery.country ?? '', phone: gallery.phone ?? '', email: gallery.email ?? '',
      currency: gallery.currency ?? 'USD', defaultPricePerKwh: gallery.defaultPricePerKwh ?? 0,
      lowCreditThresholdKwh: gallery.lowCreditThresholdKwh ?? 50,
      criticalCreditThresholdKwh: gallery.criticalCreditThresholdKwh ?? 10,
    },
  });
  const submit = async (values) => {
    try {
      await callables.updateGallery({ galleryId: gallery.id, patch: values });
      toast.success('Galerie modifiée.');
      onDone();
    } catch (error) { toast.error(callableError(error).message); }
  };
  return (
    <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-3 rounded-xl border border-[var(--c-border)] p-4">
      <h2 className="font-semibold">Modifier la galerie</h2>
      <Input label="Nom" error={errors.name?.message} {...register('name')} />
      <Input label="Adresse" error={errors.address?.message} {...register('address')} />
      <Input label="Ville" error={errors.city?.message} {...register('city')} />
      <Input label="Pays" error={errors.country?.message} {...register('country')} />
      <Input label="Téléphone" error={errors.phone?.message} {...register('phone')} />
      <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
      <label className="block"><span className="text-sm font-medium mb-1.5 block">Devise</span>
        <select {...register('currency')} className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]">
          <option value="USD">USD</option><option value="CDF">CDF</option>
        </select>
      </label>
      <Input label="Prix kWh par défaut" type="number" min="0" step="0.01" error={errors.defaultPricePerKwh?.message} {...register('defaultPricePerKwh')} />
      <Input label="Seuil crédit faible (kWh)" type="number" min="0" step="0.1" error={errors.lowCreditThresholdKwh?.message} {...register('lowCreditThresholdKwh')} />
      <Input label="Seuil critique (kWh)" type="number" min="0" step="0.1" error={errors.criticalCreditThresholdKwh?.message} {...register('criticalCreditThresholdKwh')} />
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onDone}>Annuler</Button><Button type="submit" loading={isSubmitting}>Enregistrer</Button></div>
    </form>
  );
}

const TABS = ['Boutiques', 'Compteurs', 'Infos', 'Tarifs'];

export default function GalleryDetailPage() {
  const { galleryId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Boutiques');
  const [editing, setEditing] = useState(false);
  const { profile } = useAuth();
  const canManage = isGalleryManager(profile);

  const { data: gallery, isLoading } = useGallery(galleryId);
  const { data: shops } = useShopsByGallery(galleryId, { status: 'ACTIVE' });
  const { data: mainMeters } = useMetersByGallery(galleryId, { type: 'MAIN', status: 'ACTIVE' });

  if (isLoading) return <AppShell title="Galerie"><LoadingState /></AppShell>;
  if (!gallery) return <AppShell title="Galerie"><EmptyState title="Galerie introuvable" /></AppShell>;

  const totalConsumed = (shops ?? []).reduce((s, x) => s + (x.totalConsumedKwh ?? 0), 0);
  const totalPurchased = (shops ?? []).reduce((s, x) => s + (x.totalPurchasedKwh ?? 0), 0);
  const totalRemaining = (shops ?? []).reduce((s, x) => s + (x.remainingKwh ?? 0), 0);
  const lowCount = (shops ?? []).filter((s) => s.balanceStatus === 'LOW').length;
  const critCount = (shops ?? []).filter((s) => ['CRITICAL', 'EXHAUSTED'].includes(s.balanceStatus)).length;

  return (
    <AppShell title={gallery.name} showBack>
      <PageHeader
        title={gallery.name}
        subtitle={`${gallery.code} · ${gallery.city || '—'}`}
        actions={<StatusBadge status={gallery.status} />}
      />

      {canManage && (
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={() => setEditing((value) => !value)}>
            <Pencil size={16} /> Modifier la galerie
          </Button>
        </div>
      )}

      {editing && canManage && <GalleryEditForm gallery={gallery} onDone={() => setEditing(false)} />}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Boutiques actives" value={shops?.length ?? 0} />
        <StatCard label="Crédit faible" value={lowCount} tone={lowCount ? 'warning' : 'default'} />
        <StatCard label="Critique / épuisé" value={critCount} tone={critCount ? 'danger' : 'default'} />
        <StatCard label="Crédit total restant" value={`${totalRemaining.toFixed(1)} kWh`} />
        <StatCard label="Total consommé" value={`${totalConsumed.toFixed(1)} kWh`} />
        <StatCard label="Total acheté" value={`${totalPurchased.toFixed(1)} kWh`} />
      </div>

      <nav className="mt-6 flex gap-1 border-b border-[var(--c-border)]" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-3 min-h-touch text-sm font-medium ${
              tab === t
                ? 'text-brand-600 border-b-2 border-brand-600'
                : 'text-[var(--c-text-muted)]'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="mt-4">
        {tab === 'Boutiques' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => navigate(`/shops/new?galleryId=${galleryId}`)}>
                <Plus size={16} /> Nouvelle boutique
              </Button>
            </div>
            {shops?.length ? (
              shops.map((s) => (
                <Link key={s.id} to={`/shops/${s.id}`} className="block">
                  <TouchCard
                    interactive
                    title={s.name}
                    subtitle={`${s.code} · Reste ${s.remainingKwh ?? 0} kWh`}
                    trailing={<StatusBadge status={s.balanceStatus} />}
                  />
                </Link>
              ))
            ) : (
              <EmptyState title="Aucune boutique" description="Ajoutez une première boutique." />
            )}
          </div>
        )}

        {tab === 'Infos' && (
          <dl className="space-y-3 text-sm">
            <Row label="Adresse" value={gallery.address || '—'} />
            <Row label="Ville" value={gallery.city || '—'} />
            <Row label="Pays" value={gallery.country || '—'} />
            <Row label="Téléphone" value={gallery.phone || '—'} />
            <Row label="Email" value={gallery.email || '—'} />
            <Row label="Devise" value={gallery.currency} />
            <Row label="Prix par défaut" value={formatCurrency(gallery.defaultPricePerKwh, gallery.currency)} />
            <Row label="Seuil crédit faible" value={`${gallery.lowCreditThresholdKwh} kWh`} />
            <Row label="Seuil critique" value={`${gallery.criticalCreditThresholdKwh} kWh`} />
          </dl>
        )}

        {tab === 'Compteurs' && (
          <div className="space-y-3">
            {canManage && (
              <div className="flex justify-end">
                <Button size="sm" onClick={() => navigate(`/meters/new?galleryId=${galleryId}&type=MAIN`)}>
                  <Plus size={16} /> Nouveau compteur général
                </Button>
              </div>
            )}
            {mainMeters?.length ? mainMeters.map((meter) => (
              <Link key={meter.id} to={`/meters/${meter.id}`} className="block">
                <TouchCard
                  interactive
                  title={meter.name}
                  subtitle={`${meter.code} · Index ${meter.lastTotalKwh ?? meter.initialKwh ?? 0} kWh`}
                  trailing={<StatusBadge status={meter.status} />}
                />
              </Link>
            )) : <EmptyState icon={<Gauge size={28} />} title="Aucun compteur général" description="Ajoutez le compteur principal qui dessert cette galerie." />}
          </div>
        )}

        {tab === 'Tarifs' && (
          <EmptyState title="Tarifs" description="Gestion des tarifs à l'ÉTAPE 5." />
        )}
      </div>
    </AppShell>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-[var(--c-border)] last:border-0">
      <dt className="text-[var(--c-text-muted)]">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
