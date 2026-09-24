import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Input from '@/components/ui/Input';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { callables, callableError } from '@/lib/firebase/callables';
import { subscribeUser } from '../services/usersService';
import { useEffect, useState as useStateAlias } from 'react';
import { ROLE_LABELS_FR, ROLES } from '@/constants/roles';
import { formatDateTime } from '@/lib/formatters';

export default function UserDetailPage() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [user, setUser] = useStateAlias(null);
  const [loading, setLoading] = useStateAlias(true);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!uid) return undefined;
    const unsub = subscribeUser(uid, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const canArchive =
    [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(profile?.role) &&
    profile?.uid !== uid &&
    user?.status !== 'ARCHIVED';

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
      <PageHeader
        title={user.fullName}
        subtitle={user.email}
        actions={<StatusBadge status={user.status} />}
      />

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
          <Button variant="danger" size="lg" onClick={() => setArchiveOpen(true)}>
            Archiver l&apos;utilisateur
          </Button>
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
        <Input
          label="Motif (obligatoire)"
          value={archiveReason}
          onChange={(e) => setArchiveReason(e.target.value)}
        />
      </ConfirmDialog>
    </AppShell>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-[var(--c-border)] last:border-0 gap-3">
      <dt className="text-[var(--c-text-muted)]">{label}</dt>
      <dd className="font-medium text-right break-all">{value}</dd>
    </div>
  );
}