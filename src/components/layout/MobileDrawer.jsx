import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity, Bell, Building2, FileText, Gauge, Home, LogOut, Receipt,
  Settings, ShoppingCart, Store, User, Users, Wrench, X, Zap,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getAllowedNavigationForRole } from '@/lib/permissions';

const ICONS = {
  '/dashboard': Home,
  '/galleries': Building2,
  '/shops': Store,
  '/meters': Gauge,
  '/readings': FileText,
  '/energy-purchases': ShoppingCart,
  '/alerts': Bell,
  '/incidents': Wrench,
  '/power-status': Zap,
  '/reports': Activity,
  '/invoices': Receipt,
  '/users': Users,
  '/settings': Settings,
  '/profile': User,
};

/**
 * Tiroir latéral mobile. Ferme sur swipe-right, touche Escape, clic overlay.
 * Lock le scroll du body tant qu'il est ouvert.
 */
export default function MobileDrawer({ open, onClose, children }) {
  const { profile, signOut } = useAuth();
  const items = getAllowedNavigationForRole(profile?.role);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={[
          'fixed inset-0 z-drawer bg-black/40 transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={[
          'fixed top-0 left-0 bottom-0 w-[80%] max-w-sm z-drawer',
          'bg-[var(--c-surface)] shadow-2xl safe-top safe-bottom',
          'transition-transform duration-300 ease-drawer',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--c-border)]">
          <span className="font-semibold">Menu</span>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="min-w-touch min-h-touch flex items-center justify-center rounded-full active:bg-slate-100"
          >
            <X size={22} />
          </button>
        </div>
        <div className="app-scroll h-[calc(100dvh-56px)] p-4">
          {children ?? (
            <nav aria-label="Navigation secondaire" className="space-y-1">
              {items.map(({ to, label }) => {
                const Icon = ICONS[to] ?? Home;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onClose}
                    className={({ isActive }) => [
                      'flex items-center gap-3 min-h-touch rounded-xl px-3 text-sm font-medium',
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-sky-950 dark:text-brand-300'
                        : 'text-[var(--c-text)] active:bg-slate-100 dark:active:bg-slate-700',
                    ].join(' ')}
                  >
                    <Icon size={19} aria-hidden="true" />
                    <span>{label}</span>
                  </NavLink>
                );
              })}
              <button
                type="button"
                onClick={() => { onClose(); signOut(); }}
                className="flex items-center gap-3 min-h-touch w-full rounded-xl px-3 text-sm font-medium text-danger-dark active:bg-red-50"
              >
                <LogOut size={19} aria-hidden="true" />
                <span>Se déconnecter</span>
              </button>
            </nav>
          )}
        </div>
      </aside>
    </>
  );
}