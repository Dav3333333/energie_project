import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLE_LABELS_FR } from '@/constants/roles';

export default function DashboardPlaceholder() {
  const { profile } = useAuth();
  return (
    <AppShell title="Tableau de bord">
      <div className="space-y-4">
        <p className="text-lg font-semibold">
          Bonjour {profile?.firstName ?? ''} 👋
        </p>
        <p className="text-sm text-[var(--c-text-muted)]">
          Rôle : {ROLE_LABELS_FR[profile?.role] ?? '—'}
        </p>
        <p className="text-sm text-[var(--c-text-muted)]">
          Les tableaux de bord par rôle seront développés à l&apos;ÉTAPE 5.
        </p>
      </div>
    </AppShell>
  );
}