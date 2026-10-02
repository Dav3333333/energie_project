/**
 * Encapsule un formulaire mobile :
 * - Corps et action suivent le même défilement.
 * - L'action reste dans le flux pour ne jamais masquer les derniers champs.
 */
export default function MobileFormLayout({ children, footer }) {
  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 space-y-4">{children}</div>
      {footer && (
        <div className="mt-6 flex w-full px-4 py-3 bg-[var(--c-surface)] border-t border-[var(--c-border)] safe-x">
          {footer}
        </div>
      )}
    </div>
  );
}
