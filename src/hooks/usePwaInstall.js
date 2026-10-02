import { useEffect, useState } from 'react';

/**
 * Capture l'événement beforeinstallprompt (Chrome/Edge Android).
 * Sur iOS Safari, l'installation est manuelle (Partager > Sur l'écran d'accueil).
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSecureContext, setIsSecureContext] = useState(true);

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    if (
      window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
    ) {
      setIsInstalled(true);
    }
    setIsSecureContext(window.isSecureContext);
    setIsIOS(
      /iPad|iPhone|iPod/.test(window.navigator.userAgent)
      || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1),
    );

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  return { canInstall: !!deferredPrompt, isInstalled, isIOS, isSecureContext, promptInstall };
}
