import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
} from 'firebase/firestore';
import env, { assertFirebaseEnv } from '@/config/env';

assertFirebaseEnv();

const app = getApps().length ? getApp() : initializeApp(env.firebase);

// Firestore — persistance locale tentée (lecture offline), fallback silencieux si non supportée.
let firestore;
try {
  firestore = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    ignoreUndefinedProperties: true,
  });
} catch {
  firestore = getFirestore(app);
}

export const auth = getAuth(app);
export const db = firestore;

// Persistance Auth : localStorage en prod, mémoire en dev pour éviter les fuites entre tests.
setPersistence(auth, env.useEmulators ? inMemoryPersistence : browserLocalPersistence).catch(() => {
  // Persistence indisponible — on continue avec le comportement par défaut.
});

// Persistance Firestore (offline lecture seule). Echec = dégradation silencieuse.
enableIndexedDbPersistence(db).catch(() => {
  // Multi-onglets ou navigateur non compatible — on continue sans persistance locale.
});

if (env.useEmulators) {
  connectAuthEmulator(auth, `http://${env.emulators.authHost}`, { disableWarnings: true });
  connectFirestoreEmulator(db, ...env.emulators.firestoreHost.split(':'));
}

export { app };