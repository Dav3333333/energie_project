import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Tiroir latéral mobile. Ferme sur swipe-right, touche Escape, clic overlay.
 * Lock le scroll du body tant qu'il est ouvert.
 */
export default function MobileDrawer({ open, onClose, children }) {
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
            <p className="text-sm text-[var(--c-text-muted)]">
              Contenu du menu à définir à l&apos;ÉTAPE 3 selon le rôle.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}