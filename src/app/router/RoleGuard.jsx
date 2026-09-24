import { useAuth } from '@/features/auth/hooks/useAuth';

/**
 * Affiche `children` uniquement si le rôle est autorisé. Sinon rend `fallback`.
 * À utiliser pour masquer des boutons/actions dans une page.
 */
export default function RoleGuard({ roles, children, fallback = null }) {
  const { profile } = useAuth();
  if (!profile) return fallback;
  const allowed = Array.isArray(roles) ? roles : [roles];
  return allowed.includes(profile.role) ? children : fallback;
}