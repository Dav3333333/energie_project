import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Input from '@/components/ui/Input';
import MobileFormLayout from '@/components/forms/MobileFormLayout';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGalleries } from '@/features/galleries/hooks/useGalleries';
import { useShopsByGallery } from '@/features/shops/hooks/useShops';
import { callables, callableError } from '@/lib/firebase/callables';
import { subscribeUser } from '../services/usersService';
import { ROLE_LABELS_FR, ROLES } from '@/constants/roles';
import { formatDateTime } from '@/lib/formatters';

export default function UserDetailPage() {
  const { uid } = useParams();
  const { profile } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!uid) return undefined;
    const unsubscribe = subscribeUser(uid, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    }, (error) => {
      console.error('[users] Impossible de charger le compte:', error);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  const isSuperAdmin = profile?.role === ROLES.SUPER_ADMIN;
  const galleryAdminCanManage = profile?.role === ROLES.GALLERY_ADMIN
    && profile?.uid !== uid
    && ['TECHNICIAN', 'SHOP_OWNER', 'SHOP_WORKER'].includes(user?.role)
    && (user?.galleryIds ?? []).some((galleryId) => (profile?.galleryIds ?? []).includes(galleryId));
  const canEdit = isSuperAdmin || galleryAdminCanManage;
  const canArchive = canEdit && profile?.uid !== uid && user?.status !== 'ARCHIVED';

  const onArchive = async () => {
    if (archiveReason.trim().length < 3) {
      toast.error('Motif requis.');
      return;
    }
    setArchiving(true);
    try {
      await callables.archiveManagedUser({ targetUid: uid, reason: archiveReason });
      toast.success('Utilisateur archivé.');
      setArchiveOpen(false);
    } catch (err) {
      toast.error(callableError(err).message);
    } finally {
      setArchiving(false);
    }
  };

  if (loading) return <AppShell title="Utilisateur" showBack><LoadingState /></AppShell>;
  if (!user) return <AppShell title="Utilisateur" showBack><EmptyState title="Utilisateur introuvable" /></AppShell>;

  return (
    <AppShell title={user.fullName} showBack>
      <PageHeader title={user.fullName} subtitle={user.email} actions={<StatusBadge status={user.status} />} />
      {canEdit && !editing && (
        <div className="mb-5 flex justify-end">
          <Button variant="outline" onClick={() => setEditing(true)}>Modifier l&apos;utilisateur</Button>
        </div>
      )}
      {editing && <UserEditForm user={user} isSuperAdmin={isSuperAdmin} onCancel={() => setEditing(false)} />}

      <dl className="space-y-2 text-sm">
        <Row label="Identifiant" value={user.username} />
        <Row label="Rôle" value={ROLE_LABELS_FR[user.role] ?? user.role} />
        <Row label="Téléphone" value={user.phone || '—'} />
        <Row label="Créé le" value={formatDateTime(user.createdAt)} />
        <Row label="Dernière connexion" value={formatDateTime(user.lastLoginAt)} />
        <Row label="Galeries" value={(user.galleryIds ?? []).join(', ') || '—'} />
        <Row label="Boutiques" value={(user.shopIds ?? []).join(', ') || '—'} />
      </dl>

      {canArchive && (
        <div className="mt-6">
          <Button variant="danger" size="lg" onClick={() => setArchiveOpen(true)}>Archiver l&apos;utilisateur</Button>
        </div>
      )}

      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={onArchive}
        loading={archiving}
        title="Archiver l'utilisateur"
        message="Le compte sera désactivé (statut ARCHIVED). L'historique métier est conservé."
        confirmLabel="Archiver"
      >
        <Input label="Motif (obligatoire)" value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} />
      </ConfirmDialog>
    </AppShell>
  );
}

function UserEditForm({ user, isSuperAdmin, onCancel }) {
  const { data: galleriesData } = useGalleries();
  const galleries = galleriesData ?? [];
  const [firstName, setFirstName] = useState(user.firstName ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status ?? 'ACTIVE');
  const [galleryId, setGalleryId] = useState(user.galleryIds?.[0] ?? '');
  const [shopId, setShopId] = useState(user.shopIds?.[0] ?? '');
  const [saving, setSaving] = useState(false);
  const { data: shopsData } = useShopsByGallery(galleryId);
  const shops = useMemo(() => shopsData ?? [], [shopsData]);
  const needsShop = [ROLES.SHOP_OWNER, ROLES.SHOP_WORKER].includes(role);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (isSuperAdmin && role !== ROLES.SUPER_ADMIN && !galleryId) {
      toast.error('Sélectionnez une galerie.');
      return;
    }
    if (isSuperAdmin && needsShop && !shopId) {
      toast.error('Sélectionnez une boutique.');
      return;
    }
    const patch = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      phone: phone.trim() || null,
    };
    if (isSuperAdmin) {
      patch.role = role;
      patch.status = status;
      patch.galleryIds = role === ROLES.SUPER_ADMIN ? [] : [galleryId];
      patch.shopIds = needsShop ? [shopId] : [];
    }
    setSaving(true);
    try {
      await callables.updateManagedUser({ targetUid: user.uid, patch });
      toast.success('Utilisateur modifié.');
      onCancel();
    } catch (error) {
      toast.error(callableError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileFormLayout footer={(
      <div className="flex w-full gap-2">
        <Button type="button" variant="outline" size="md" className="min-h-touch-lg flex-1 px-2" onClick={onCancel}>Annuler</Button>
        <Button type="submit" size="md" className="min-h-touch-lg flex-1 px-2" form="edit-user-form" loading={saving}>Enregistrer</Button>
      </div>
    )}>
      <form id="edit-user-form" onSubmit={onSubmit} className="mb-5 space-y-4 rounded-xl border border-[var(--c-border)] p-4">
        <h2 className="font-semibold">Modifier le compte</h2>
        <Input label="Prénom" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
        <Input label="Nom" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
        <Input label="Téléphone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        {isSuperAdmin && (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Statut</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full min-h-touch rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-3">
                <option value="ACTIVE">Actif</option><option value="ARCHIVED">Archivé</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Rôle</span>
              <select value={role} onChange={(event) => setRole(event.target.value)} className="w-full min-h-touch rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-3">
                {Object.values(ROLES).map((value) => <option key={value} value={value}>{ROLE_LABELS_FR[value]}</option>)}
              </select>
            </label>
            {role !== ROLES.SUPER_ADMIN && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Galerie</span>
                <select value={galleryId} onChange={(event) => { setGalleryId(event.target.value); setShopId(''); }} className="w-full min-h-touch rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-3">
                  <option value="">Sélectionner une galerie</option>
                  {galleries.map((gallery) => <option key={gallery.id} value={gallery.id}>{gallery.name}</option>)}
                </select>
              </label>
            )}
            {needsShop && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Boutique</span>
                <select value={shopId} onChange={(event) => setShopId(event.target.value)} disabled={!galleryId} className="w-full min-h-touch rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-3 disabled:opacity-60">
                  <option value="">Sélectionner une boutique</option>
                  {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
                </select>
              </label>
            )}
          </>
        )}
      </form>
    </MobileFormLayout>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[var(--c-border)] py-2 last:border-0">
      <dt className="text-[var(--c-text-muted)]">{label}</dt>
      <dd className="break-all text-right font-medium">{value}</dd>
    </div>
  );
}
