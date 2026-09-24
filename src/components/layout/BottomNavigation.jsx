import { NavLink } from 'react-router-dom';
import {
  Home, Building2, Store, Gauge, FileText, Bell, ShoppingCart, Wrench, User,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLES } from '@/constants/roles';

const ICON_MAP = {
  '/dashboard': Home,
  '/galleries': Building2,
  '/shops': Store,
  '/meters': Gauge,
  '/readings': FileText,
  '/energy-purchases': ShoppingCart,
  '/alerts': Bell,
  '/incidents': Wrench,
  '/invoices': FileText,
  '/users': User,
  '/profile': User,
};

function navFor(role) {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return [
        { to: '/dashboard', label: 'Accueil' },
        { to: '/galleries', label: 'Galeries' },
        { to: '/alerts', label: 'Alertes' },
        { to: '/profile', label: 'Profil' },
      ];
    case ROLES.GALLERY_ADMIN:
      return [
        { to: '/dashboard', label: 'Accueil' },
        { to: '/shops', label: 'Boutiques' },
        { to: '/energy-purchases', label: 'Achats' },
        { to: '/alerts', label: 'Alertes' },
        { to: '/profile', label: 'Profil' },
      ];
    case ROLES.TECHNICIAN:
      return [
        { to: '/dashboard', label: 'Accueil' },
        { to: '/readings', label: 'Relevés' },
        { to: '/meters', label: 'Compteurs' },
        { to: '/alerts', label: 'Alertes' },
        { to: '/profile', label: 'Profil' },
      ];
    case ROLES.SHOP_OWNER:
      return [
        { to: '/dashboard', label: 'Accueil' },
        { to: '/shops', label: 'Boutiques' },
        { to: '/energy-purchases', label: 'Achats' },
        { to: '/alerts', label: 'Alertes' },
        { to: '/profile', label: 'Profil' },
      ];
    case ROLES.SHOP_WORKER:
      return [
        { to: '/dashboard', label: 'Accueil' },
        { to: '/alerts', label: 'Alertes' },
        { to: '/profile', label: 'Profil' },
      ];
    default:
      return [{ to: '/dashboard', label: 'Accueil' }];
  }
}

export default function BottomNavigation() {
  const { profile } = useAuth();
  const items = navFor(profile?.role);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-bottom-nav bg-[var(--c-surface)] border-t border-[var(--c-border)] safe-bottom"
      aria-label="Navigation principale"
      style={{ paddingBottom: 'var(--sab)' }}
    >
      <ul
        className="grid h-[var(--bottomnav-h)]"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ to, label }) => {
          const Icon = ICON_MAP[to] ?? Home;
          return (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center justify-center h-full gap-0.5',
                    'text-[11px] font-medium transition-colors',
                    isActive
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-[var(--c-text-muted)]',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}