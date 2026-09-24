import { useKeyboardInset } from '@/hooks/useKeyboardInset';

/**
 * Encapsule un formulaire mobile :
 * - Corps scrollable.
 * - Barre d'action fixe au-dessus du clavier (si ouvert) et de la BottomNav.
 */
export default function MobileFormLayout({ children, footer }) {
  const keyboard = useKeyboardInset();
  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 space-y-4">{children}</div>
      {footer && (
        <div
          className="fixed inset-x-0 z-40 px-4 py-3 bg-[var(--c-surface)] border-t border-[var(--c-border)] safe-x"
          style={{
            bottom: keyboard > 0 ? `${keyboard}px` : 'var(--scroll-bottom-offset)',
            transition: 'bottom 150ms ease',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}