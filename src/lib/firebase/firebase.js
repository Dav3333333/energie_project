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
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import env, { assertFirebaseEnv } from '@/config/env';

assertFirebaseEnv();

const app = getApps().length ? getApp() : initializeApp(env.firebase);

// Firestore — persistance locale tentée (lecture offline), fallback silencieux si non supportée.
let firestore;
try {
  firestore = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    cache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
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

if (env.useEmulators) {
  connectAuthEmulator(auth, `http://${env.emulators.authHost}`, { disableWarnings: true });
  connectFirestoreEmulator(db, ...env.emulators.firestoreHost.split(':'));
}

export { app };