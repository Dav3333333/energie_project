import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { LogOut, ShieldCheck, UserCircle2 } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { changePasswordSchema } from '../schemas/authSchemas';
import { changePassword, mapAuthError } from '../services/authService';
import { ROLE_LABELS_FR } from '@/constants/roles';
import { formatDateTime } from '@/lib/formatters';

export default function ProfilePage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(changePasswordSchema) });

  const onSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const onChangePassword = async (values) => {
    setSubmitting(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      toast.success('Mot de passe mis à jour.');
      reset();
    } catch (err) {
      toast.error(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Profil">
      <section className="rounded-2xl bg-[var(--c-surface)] border border-[var(--c-border)] p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
            <UserCircle2 size={28} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{profile?.fullName ?? '—'}</p>
            <p className="text-sm text-[var(--c-text-muted)] truncate">{profile?.email}</p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[var(--c-text-muted)]">Rôle</dt>
            <dd className="font-medium">{ROLE_LABELS_FR[profile?.role] ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[var(--c-text-muted)]">Statut</dt>
            <dd className="font-medium">{profile?.status ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[var(--c-text-muted)]">Identifiant</dt>
            <dd className="font-medium truncate">{profile?.username ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[var(--c-text-muted)]">Dernière connexion</dt>
            <dd className="font-medium">{formatDateTime(profile?.lastLoginAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-2xl bg-[var(--c-surface)] border border-[var(--c-border)] p-4 shadow-card">
        <header className="flex items-center gap-2 mb-4">
          <ShieldCheck size={18} />
          <h2 className="font-semibold">Changer le mot de passe</h2>
        </header>
        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-3" noValidate>
          <Input
            label="Mot de passe actuel"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <Input
            label="Nouveau mot de passe"
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <Input
            label="Confirmer le mot de passe"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <Button type="submit" variant="primary" loading={submitting} size="lg">
            Mettre à jour
          </Button>
        </form>
      </section>

      <section className="mt-6">
        <Button variant="outline" size="lg" onClick={onSignOut}>
          <LogOut size={18} />
          Se déconnecter
        </Button>
      </section>
    </AppShell>
  );
}