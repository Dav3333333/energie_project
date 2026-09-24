import { useEffect } from 'react';

/**
 * Feuille glissante depuis le bas — alternative mobile aux modales.
 * Ferme par clic sur overlay, touche Escape, ou swipe down basique.
 */
export default function BottomSheet({ open, onClose, title, children }) {
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
          'fixed inset-0 z-modal bg-black/40 transition-opacity',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={[
          'fixed inset-x-0 bottom-0 z-modal bg-[var(--c-surface)] rounded-t-2xl',
          'max-h-[85dvh] flex flex-col safe-bottom',
          'transition-transform duration-300 ease-drawer',
          open ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        <div className="pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-[var(--c-border)]" />
        </div>
        {title && (
          <h2 className="px-4 py-3 text-base font-semibold border-b border-[var(--c-border)]">
            {title}
          </h2>
        )}
        <div className="app-scroll p-4">{children}</div>
      </div>
    </>
  );
}