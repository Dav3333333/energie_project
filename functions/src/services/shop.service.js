const { db, admin } = require('../config/admin');
const { AppError, ERROR_CODES } = require('../utils/errors');
const {
  DEFAULT_LOW_THRESHOLD_KWH,
  DEFAULT_CRITICAL_THRESHOLD_KWH,
} = require('../constants/app');

async function createShop({ input, actorUserId }) {
  const galleryRef = db.collection('galleries').doc(input.galleryId);
  const gallerySnap = await galleryRef.get();
  if (!gallerySnap.exists) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Galerie introuvable.');
  }

  // Unicité du code dans la galerie.
  const dup = await db
    .collection('shops')
    .where('galleryId', '==', input.galleryId)
    .where('code', '==', input.code)
    .limit(1)
    .get();
  if (!dup.empty) {
    throw new AppError(ERROR_CODES.ALREADY_EXISTS, 'Ce code boutique existe déjà dans cette galerie.');
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = db.collection('shops').doc();

  const data = {
    galleryId: input.galleryId,
    name: input.name,
    code: input.code,
    description: input.description ?? null,
    location: input.location ?? null,
    ownerIds: input.ownerIds ?? [],
    workerIds: input.workerIds ?? [],
    meterIds: [],
    status: 'ACTIVE',

    customPricePerKwh: input.customPricePerKwh ?? null,
    lowCreditThresholdKwh: input.lowCreditThresholdKwh ?? null,
    criticalCreditThresholdKwh: input.criticalCreditThresholdKwh ?? null,

    currentPowerStatus: 'UNKNOWN',
    currentEnergySource: 'UNKNOWN',

    // Champs calculés — jamais définis par le client.
    totalPurchasedKwh: 0,
    totalConsumedKwh: 0,
    remainingKwh: 0,
    remainingAmount: 0,
    activePricePerKwh: Number(gallerySnap.data().defaultPricePerKwh ?? 0),
    averageDailyConsumptionKwh: null,
    estimatedDaysRemaining: null,
    estimatedDepletionDate: null,
    balanceStatus: 'UNKNOWN',

    lastReadingAt: null,
    lastPurchaseAt: null,
    lastBalanceCalculatedAt: null,

    createdAt: now,
    updatedAt: now,
    createdByUserId: actorUserId,
  };

  await ref.set(data);
  return { id: ref.id, ...data };
}

async function updateShop({ shopId, patch, actorUserId }) {
  const ref = db.collection('shops').doc(shopId);
  const snap = await ref.get();
  if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Boutique introuvable.');

  // Interdiction explicite de toucher aux champs calculés (défense supplémentaire).
  const forbidden = [
    'totalPurchasedKwh', 'totalConsumedKwh', 'remainingKwh', 'remainingAmount',
    'averageDailyConsumptionKwh', 'estimatedDaysRemaining', 'estimatedDepletionDate',
    'balanceStatus', 'activePricePerKwh', 'lastBalanceCalculatedAt',
    'lastReadingAt', 'lastPurchaseAt',
  ];
  for (const f of forbidden) {
    if (f in patch) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, `Champ interdit : ${f}`);
    }
  }

  const update = {
    ...patch,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedByUserId: actorUserId,
  };
  await ref.update(update);
  return { id: shopId, previous: snap.data() };
}

async function archiveShop({ shopId, reason, actorUserId }) {
  const ref = db.collection('shops').doc(shopId);
  const snap = await ref.get();
  if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Boutique introuvable.');

  await ref.update({
    status: 'ARCHIVED',
    archivedAt: admin.firestore.FieldValue.serverTimestamp(),
    archivedByUserId: actorUserId,
    archiveReason: reason ?? null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { id: shopId, previous: snap.data() };
}

module.exports = { createShop, updateShop, archiveShop };