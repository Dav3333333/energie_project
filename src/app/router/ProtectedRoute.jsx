import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import LoadingState from '@/components/common/LoadingState';
import AccessDenied from '@/components/common/AccessDenied';

export default function ProtectedRoute({ roles = null }) {
  const { isAuthenticated, initializing, profileLoading, profile } = useAuth();
  const location = useLocation();

  if (initializing || profileLoading) {
    return <LoadingState fullScreen label="Chargement…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!profile) {
    return <AccessDenied message="Profil utilisateur introuvable." />;
  }

  if (profile.status !== 'ACTIVE') {
    return <AccessDenied message="Votre compte n'est pas actif. Contactez un administrateur." />;
  }

  if (roles && !roles.includes(profile.role)) {
    return <AccessDenied message="Vous n'avez pas accès à cette section." />;
  }

  return <Outlet />;
}