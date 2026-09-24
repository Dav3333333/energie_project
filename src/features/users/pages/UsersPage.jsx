import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import Button from '@/components/ui/Button';
import TouchCard from '@/components/mobile/TouchCard';
import StatusBadge from '@/components/common/StatusBadge';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { listUsersByGallery } from '../services/usersService';
import { ROLE_LABELS_FR, ROLES } from '@/constants/roles';
import { toast } from 'sonner';

export default function UsersPage() {
  const { profile, galleryIds } = useAuth();
  const navigate = useNavigate();
  const galleryId = galleryIds?.[0];
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!galleryId) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listUsersByGallery(galleryId);
        if (!cancelled) setUsers(list);
      } catch (err) {
        toast.error(err.message ?? 'Erreur de chargement.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId]);

  const canCreate = [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(profile?.role);

  return (
    <AppShell title="Utilisateurs">
      <PageHeader
        title="Utilisateurs"
        subtitle={`${users?.length ?? 0} compte(s)`}
        actions={
          canCreate && (
            <Button size="sm" onClick={() => navigate('/users/new')}>
              <Plus size={16} /> Nouveau
            </Button>
          )
        }
      />

      {loading ? (
        <LoadingState />
      ) : users?.length ? (
        <div className="space-y-3">
          {users.map((u) => (
            <TouchCard
              key={u.uid}
              interactive
              onClick={() => navigate(`/users/${u.uid}`)}
              title={u.fullName || u.email}
              subtitle={`${u.email} · ${ROLE_LABELS_FR[u.role] ?? u.role}`}
              trailing={<StatusBadge status={u.status} />}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Users size={28} />} title="Aucun utilisateur" />
      )}
    </AppShell>
  );
}