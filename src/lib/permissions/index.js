import { ROLES } from '@/constants/roles';

export function hasRole(profile, roles) {
  if (!profile) return false;
  const list = Array.isArray(roles) ? roles : [roles];
  return list.includes(profile.role);
}

export function isSuperAdmin(profile) {
  return profile?.role === ROLES.SUPER_ADMIN;
}

export function hasGalleryAccess(profile, galleryId) {
  if (!profile || profile.status !== 'ACTIVE') return false;
  if (profile.role === ROLES.SUPER_ADMIN) return true;
  return (profile.galleryIds ?? []).includes(galleryId);
}

export function hasShopAccess(profile, shopId) {
  if (!profile || profile.status !== 'ACTIVE') return false;
  if (profile.role === ROLES.SUPER_ADMIN) return true;
  return (profile.shopIds ?? []).includes(shopId);
}

/**
 * Retourne les entrées de navigation autorisées selon le rôle.
 * Utilisé par BottomNavigation (mobile) et éventuelle sidebar (desktop).
 */
export function getAllowedNavigationForRole(role) {
  const common = [{ to: '/dashboard', label: 'Accueil' }, { to: '/profile', label: 'Profil' }];

  switch (role) {
    case ROLES.SUPER_ADMIN:
      return [
        { to: '/dashboard', label: 'Accueil' },
        { to: '/galleries', label: 'Galeries' },
        { to: '/shops', label: 'Boutiques' },
        { to: '/users', label: 'Utilisateurs' },
        { to: '/profile', label: 'Profil' },
      ];
    case ROLES.GALLERY_ADMIN:
      return [
        { to: '/dashboard', label: 'Accueil' },
        { to: '/shops', label: 'Boutiques' },
        { to: '/readings', label: 'Relevés' },
        { to: '/alerts', label: 'Alertes' },
        { to: '/profile', label: 'Profil' },
      ];
    case ROLES.TECHNICIAN:
      return [
        { to: '/dashboard', label: 'Accueil' },
        { to: '/readings', label: 'Relevés' },
        { to: '/incidents', label: 'Incidents' },
        { to: '/alerts', label: 'Alertes' },
        { to: '/profile', label: 'Profil' },
      ];
    case ROLES.SHOP_OWNER:
      return [
        { to: '/dashboard', label: 'Accueil' },
        { to: '/shops', label: 'Mes boutiques' },
        { to: '/energy-purchases', label: 'Achats' },
        { to: '/invoices', label: 'Factures' },
        { to: '/profile', label: 'Profil' },
      ];
    case ROLES.SHOP_WORKER:
      return [
        { to: '/dashboard', label: 'Accueil' },
        { to: '/alerts', label: 'Alertes' },
        { to: '/profile', label: 'Profil' },
      ];
    default:
      return common;
  }
}