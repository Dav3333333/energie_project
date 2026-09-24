import { useEffect } from 'react';

/**
 * Intercepte le bouton retour Android pour les vues "overlay" (drawer, bottom sheet).
 * À n'activer QUE quand l'overlay est ouvert.
 */
export function useAndroidBack(enabled, onBack) {
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      onBack?.();
    };
    window.history.pushState({ overlay: true }, '');
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('popstate', handler);
      // Retire l'entrée ajoutée si le composant est démonté sans back
      if (window.history.state?.overlay) window.history.back();
    };
  }, [enabled, onBack]);
}