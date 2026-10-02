import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useState } from 'react';

export default function InstallPrompt() {
  const { canInstall, isInstalled, isIOS, isSecureContext, promptInstall } = usePwaInstall();
  const [showGuide, setShowGuide] = useState(false);
  if (isInstalled) return null;

  const toggleGuide = () => setShowGuide((open) => !open);
  const handleInstall = () => {
    if (canInstall) {
      void promptInstall();
    } else {
      toggleGuide();
    }
  };

  let instructions = 'Dans le menu du navigateur, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ». Si cette option manque, ouvrez le site dans Chrome ou Edge à jour.';
  if (isIOS) {
    instructions = 'Dans Safari, touchez Partager, puis « Sur l’écran d’accueil ».';
  } else if (!isSecureContext) {
    instructions = 'L’installation est désactivée sur cette adresse HTTP. Ouvrez le site avec son adresse HTTPS, ou utilisez localhost sur cet appareil.';
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 max-w-xs rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-3 shadow-lg">
      <button
        type="button"
        onClick={handleInstall}
        className="rounded-full bg-brand-600 px-4 py-3 font-medium text-white shadow-lg min-h-touch"
        aria-expanded={showGuide}
      >
        Installer l&apos;application
      </button>
      {showGuide && (
        <p className="mt-3 text-sm text-[var(--c-text-muted)]">{instructions}</p>
      )}
    </div>
  );
}
