import { registerSW } from 'virtual:pwa-register';

let updateSW = null;

/**
 * Enregistre le Service Worker et retourne un objet { updateSW, onNeedRefresh, onOfflineReady }.
 * Ne fait rien en cas d'échec : l'app reste fonctionnelle sans SW.
 */
export function initServiceWorker({ onNeedRefresh, onOfflineReady, onError } = {}) {
  try {
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (typeof onNeedRefresh === 'function') onNeedRefresh();
      },
      onOfflineReady() {
        if (typeof onOfflineReady === 'function') onOfflineReady();
      },
      onRegisterError(error) {
        if (typeof onError === 'function') onError(error);
      },
    });
  } catch (error) {
    if (typeof onError === 'function') onError(error);
  }
  return { updateSW: () => updateSW?.() };
}