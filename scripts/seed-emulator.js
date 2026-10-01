// scripts/seed-emulator.js
import { initializeApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut,
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, setDoc, serverTimestamp,
} from 'firebase/firestore';

const config = {
  apiKey: 'fake-api-key',
  projectId: process.env.GCLOUD_PROJECT ?? 'demo-gem',
};
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

async function createUser({ email, password, username, role, galleryIds = [], shopIds = [] }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  await setDoc(doc(db, 'users', uid), {
    uid, email, username, usernameNormalized: username,
    firstName: username, lastName: 'Test',
    fullName: `${username} Test`, phone: null,
    role, status: 'ACTIVE', galleryIds, shopIds,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    createdByUserId: null, lastLoginAt: null,
  });
  await setDoc(doc(db, 'usernames', username), { uid, email, createdAt: serverTimestamp() });
  await signOut(auth);
  return uid;
}

async function main() {
  const superUid = await createUser({
    email: 'super@test.local', password: 'Passw0rd!',
    username: 'super', role: 'SUPER_ADMIN',
  });

  // Galerie
  await setDoc(doc(db, 'galleries', 'g1'), {
    name: 'Galerie Centrale', code: 'GC-01',
    address: "12 avenue de l'Énergie", city: 'Kinshasa', country: 'RDC',
    phone: '+243000000000', email: 'contact@galerie.local',
    currency: 'USD', defaultPricePerKwh: 0.30,
    lowCreditThresholdKwh: 50, criticalCreditThresholdKwh: 10,
    status: 'ACTIVE', mainPowerStatus: 'AVAILABLE', mainEnergySource: 'GRID',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    createdByUserId: superUid,
  });

  await createUser({
    email: 'admin@test.local', password: 'Passw0rd!',
    username: 'admin', role: 'GALLERY_ADMIN', galleryIds: ['g1'],
  });

  // Boutiques
  for (const s of [
    { id: 's1', name: 'Boutique Alpha', code: 'B-A', location: 'Aile A' },
    { id: 's2', name: 'Boutique Beta', code: 'B-B', location: 'Aile B' },
  ]) {
    await setDoc(doc(db, 'shops', s.id), {
      galleryId: 'g1', name: s.name, code: s.code,
      description: null, location: s.location,
      ownerIds: [], workerIds: [], meterIds: [],
      status: 'ACTIVE',
      customPricePerKwh: null, lowCreditThresholdKwh: null, criticalCreditThresholdKwh: null,
      currentPowerStatus: 'AVAILABLE', currentEnergySource: 'GRID',
      totalPurchasedKwh: 0, totalConsumedKwh: 0, remainingKwh: 0, remainingAmount: 0,
      activePricePerKwh: 0.30, averageDailyConsumptionKwh: null,
      estimatedDaysRemaining: null, estimatedDepletionDate: null,
      balanceStatus: 'UNKNOWN',
      lastReadingAt: null, lastPurchaseAt: null, lastBalanceCalculatedAt: null,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      createdByUserId: superUid,
    });
  }

  console.log('Seed terminé.');
  console.log('SUPER_ADMIN : super@test.local / super / Passw0rd!');
  console.log('GALLERY_ADMIN : admin@test.local / admin / Passw0rd!');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });