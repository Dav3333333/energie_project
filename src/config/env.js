/**
 * Centralise l'accès aux variables d'environnement Vite.
 * Aucune clé secrète ici : uniquement des valeurs publiques du Web SDK Firebase.
 */
const env = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  },
  useEmulators: import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true',
  emulators: {
    authHost: import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099',
    firestoreHost: import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080',
    functionsHost: import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1:5001',
    storageHost: import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199',
  },
  appCheck: {
    recaptchaV3SiteKey: import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY ?? '',
  },
};

/**
 * Vérifie que toutes les variables Firebase requises sont présentes.
 * Appelée au démarrage pour échouer vite si l'environnement est mal configuré.
 */
export function assertFirebaseEnv() {
  const missing = Object.entries(env.firebase)
    .filter(([, value]) => !value)
    .map(([key]) => `VITE_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

  if (missing.length > 0) {
    throw new Error(`Variables d'environnement manquantes : ${missing.join(', ')}`);
  }
}

export default env;