/* eslint-disable no-console */
/**
 * Remplit l'émulateur Firestore avec un jeu de données minimal de démonstration.
 * À lancer APRÈS avoir démarré les émulateurs.
 *
 * Usage :
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *   node scripts/seed-emulator.js
 */

const admin = require('firebase-admin');

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'demo-gem';

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });

const db = admin.firestore();
const auth = admin.auth();

const now = () => admin.firestore.FieldValue.serverTimestamp();

async function ensureUser({ email, password, username, role, galleryIds = [], shopIds = [] }) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = await auth.createUser({ email, password });
  }
  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    email,
    username,
    usernameNormalized: username,
    firstName: username,
    lastName: 'Test',
    fullName: `${username} Test`,
    phone: null,
    role,
    status: 'ACTIVE',
    galleryIds,
    shopIds,
    createdAt: now(),
    updatedAt: now(),
    createdByUserId: null,
    lastLoginAt: null,
  });
  await db.collection('usernames').doc(username).set({
    uid: user.uid, email, createdAt: now(),
  });
  return user.uid;
}

  // Achats de démonstration (via admin SDK, statut VALID)
  const purchases = [
    { id: 'p1', shopId: 's1', purchasedKwh: 500, pricePerKwh: 0.30 },
    { id: 'p2', shopId: 's1', purchasedKwh: 300, pricePerKwh: 0.30 },
    { id: 'p3', shopId: 's2', purchasedKwh: 400, pricePerKwh: 0.30 },
  ];
  for (const p of purchases) {
    await db.doc(`energyPurchases/${p.id}`).set({
      galleryId: 'g1',
      shopId: p.shopId,
      receiptNumber: `RC-GC-01-202509-${String(p.id).padStart(5, '0')}`,
      purchasedKwh: p.purchasedKwh,
      pricePerKwh: p.pricePerKwh,
      totalAmount: Number((p.purchasedKwh * p.pricePerKwh).toFixed(2)),
      currency: 'USD',
      paymentMethod: 'CASH',
      paymentReference: null,
      receiptFileUrl: null,
      purchaseDate: now(),
      status: 'VALID',
      createdByUserId: 'seed',
      cancelledByUserId: null,
      cancelledAt: null,
      cancellationReason: null,
      createdAt: now(),
      updatedAt: now(),
    });
  }

  // Recalcul solde initial (simulé via les achats ; lecture réelle = CF)
  await db.doc('shops/s1').update({
    totalPurchasedKwh: 800,
    totalConsumedKwh: 0,
    remainingKwh: 800,
    remainingAmount: 240,
    balanceStatus: 'NORMAL',
    lastPurchaseAt: now(),
    lastBalanceCalculatedAt: now(),
  });
  await db.doc('shops/s2').update({
    totalPurchasedKwh: 400,
    totalConsumedKwh: 0,
    remainingKwh: 400,
    remainingAmount: 120,
    balanceStatus: 'NORMAL',
    lastPurchaseAt: now(),
    lastBalanceCalculatedAt: now(),
  });

    // Événement power (galerie)
  await db.collection('galleries/g1/powerEvents').add({
    scope: 'GALLERY',
    shopId: null,
    powerStatus: 'AVAILABLE',
    energySource: 'GRID',
    description: 'État initial seed',
    source: 'MANUAL',
    declaredByUserId: 'seed',
    declaredAt: now(),
    resolvedAt: now(),
    createdAt: now(),
    updatedAt: now(),
  });

  // Incident démo
  const incRef = db.collection('incidents').doc('inc1');
  await incRef.set({
    galleryId: 'g1',
    shopId: 's2',
    title: 'Compteur Beta — relevé manquant',
    description: 'Aucun relevé depuis 30 jours.',
    category: 'METER',
    priority: 'MEDIUM',
    status: 'OPEN',
    createdByUserId: 'seed',
    assignedToUserId: null,
    resolutionNotes: null,
    openedAt: now(),
    resolvedAt: null,
    createdAt: now(),
    updatedAt: now(),
  });

  // Facture démo (totaux factices)
  await db.collection('invoices').doc('inv1').set({
    galleryId: 'g1',
    shopId: 's1',
    invoiceNumber: 'FAC-GC-01-202509-00001',
    type: 'STATEMENT',
    periodStart: now(),
    periodEnd: now(),
    openingMeterKwh: 0,
    closingMeterKwh: 0,
    consumedKwh: 0,
    purchasedKwh: 800,
    remainingKwh: 800,
    pricePerKwh: 0.30,
    consumedAmount: 0,
    remainingAmount: 240,
    currency: 'USD',
    status: 'ISSUED',
    pdfUrl: null,
    pdfPath: null,
    generatedByUserId: 'seed',
    createdAt: now(),
    updatedAt: now(),
  });

  await db.doc('counters/invoice_GC-01_202509').set({
    value: 1,
    updatedAt: now(),
  });

  console.log('Incident, power event et facture de démonstration créés.');


  // Alerte de démonstration
  await db.doc('alerts/a1').set({
    galleryId: 'g1',
    shopId: 's2',
    type: 'LOW_CREDIT',
    severity: 'WARNING',
    title: 'Crédit faible (démo)',
    message: 'Boutique Beta — reste peu de kWh.',
    status: 'OPEN',
    relatedEntityType: 'shop',
    relatedEntityId: 's2',
    createdAt: now(),
    acknowledgedAt: null,
    acknowledgedByUserId: null,
    resolvedAt: null,
    resolvedByUserId: null,
  });

  // Compteur de reçus pour cohérence du prochain numéro
  await db.doc('counters/receipt_GC-01_202509').set({
    value: 3,
    updatedAt: now(),
  });

async function main() {
  // SUPER_ADMIN
  await ensureUser({
    email: 'super@test.local',
    password: 'Passw0rd!',
    username: 'super',
    role: 'SUPER_ADMIN',
  });

  // Galerie
  const galleryRef = db.collection('galleries').doc('g1');
  await galleryRef.set({
    name: 'Galerie Centrale',
    code: 'GC-01',
    address: '12 avenue de l\'Énergie',
    city: 'Kinshasa',
    country: 'RDC',
    phone: '+243000000000',
    email: 'contact@galerie.local',
    currency: 'USD',
    defaultPricePerKwh: 0.30,
    lowCreditThresholdKwh: 50,
    criticalCreditThresholdKwh: 10,
    status: 'ACTIVE',
    mainPowerStatus: 'AVAILABLE',
    mainEnergySource: 'GRID',
    createdAt: now(),
    updatedAt: now(),
    createdByUserId: 'seed',
  });

  // Admin galerie
  await ensureUser({
    email: 'admin@test.local',
    password: 'Passw0rd!',
    username: 'admin',
    role: 'GALLERY_ADMIN',
    galleryIds: ['g1'],
  });
  await db.doc('galleries/g1/admins/seedAdmin').set({
    userId: 'seedAdmin', assignedAt: now(), assignedByUserId: 'seed',
  });

  // Boutiques
  const shops = [
    { id: 's1', name: 'Boutique Alpha', code: 'B-A', location: 'Aile A' },
    { id: 's2', name: 'Boutique Beta', code: 'B-B', location: 'Aile B' },
  ];
  for (const s of shops) {
    await db.doc(`shops/${s.id}`).set({
      galleryId: 'g1',
      name: s.name,
      code: s.code,
      description: null,
      location: s.location,
      ownerIds: [],
      workerIds: [],
      meterIds: [],
      status: 'ACTIVE',
      customPricePerKwh: null,
      lowCreditThresholdKwh: null,
      criticalCreditThresholdKwh: null,
      currentPowerStatus: 'AVAILABLE',
      currentEnergySource: 'GRID',
      totalPurchasedKwh: 0,
      totalConsumedKwh: 0,
      remainingKwh: 0,
      remainingAmount: 0,
      activePricePerKwh: 0.30,
      averageDailyConsumptionKwh: null,
      estimatedDaysRemaining: null,
      estimatedDepletionDate: null,
      balanceStatus: 'UNKNOWN',
      lastReadingAt: null,
      lastPurchaseAt: null,
      lastBalanceCalculatedAt: null,
      createdAt: now(),
      updatedAt: now(),
      createdByUserId: 'seed',
    });
  }

  // Compteurs
  await db.doc('meters/m1').set({
    galleryId: 'g1',
    shopId: 's1',
    parentMeterId: null,
    type: 'SUB_METER',
    code: 'M-A',
    serialNumber: 'SN-001',
    name: 'Compteur Alpha',
    description: null,
    readingMode: 'MANUAL',
    status: 'ACTIVE',
    initialKwh: 0,
    lastTotalKwh: 0,
    lastValidReadingId: null,
    lastReadingAt: null,
    createdAt: now(),
    updatedAt: now(),
    createdByUserId: 'seed',
  });
  await db.doc('meters/m2').set({
    galleryId: 'g1',
    shopId: 's2',
    parentMeterId: null,
    type: 'SUB_METER',
    code: 'M-B',
    serialNumber: 'SN-002',
    name: 'Compteur Beta',
    description: null,
    readingMode: 'MANUAL',
    status: 'ACTIVE',
    initialKwh: 0,
    lastTotalKwh: 0,
    lastValidReadingId: null,
    lastReadingAt: null,
    createdAt: now(),
    updatedAt: now(),
    createdByUserId: 'seed',
  });
  await db.doc('shops/s1').update({ meterIds: ['m1'] });
  await db.doc('shops/s2').update({ meterIds: ['m2'] });

  console.log('Seed terminé.');
  console.log('SUPER_ADMIN : super@test.local / super / Passw0rd!');
  console.log('GALLERY_ADMIN : admin@test.local / admin / Passw0rd!');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });