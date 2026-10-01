import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useState } from 'react';

export default function InstallPrompt() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePwaInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  if (isInstalled || (!canInstall && !isIOS)) return null;

  if (isIOS) {
    return (
      <div className="fixed bottom-20 right-4 z-40 max-w-xs rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-3 shadow-lg">
        <button
          type="button"
          onClick={() => setShowIOSGuide((open) => !open)}
          className="rounded-full bg-brand-600 px-4 py-3 font-medium text-white shadow-lg min-h-touch"
          aria-expanded={showIOSGuide}
        >
          Installer l&apos;application
        </button>
        {showIOSGuide && (
          <p className="mt-3 text-sm text-[var(--c-text-muted)]">
            Dans Safari, touchez <strong>Partager</strong>, puis <strong>Sur l’écran d’accueil</strong>.
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void promptInstall()}
      className="fixed bottom-20 right-4 z-40 rounded-full bg-brand-600 text-white px-4 py-3 shadow-lg min-h-touch"
    >
      Installer l&apos;application
    </button>
  );
}
