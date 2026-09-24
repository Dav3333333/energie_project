const { db, admin } = require('../config/admin');
const { AppError, ERROR_CODES } = require('../utils/errors');

async function createMeter({ input, actorUserId }) {
  const shopRef = db.collection('shops').doc(input.shopId);
  const shopSnap = await shopRef.get();
  if (!shopSnap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Boutique introuvable.');
  const shop = shopSnap.data();

  // Unicité du code dans la galerie.
  const dup = await db
    .collection('meters')
    .where('galleryId', '==', shop.galleryId)
    .where('code', '==', input.code)
    .limit(1)
    .get();
  if (!dup.empty) {
    throw new AppError(ERROR_CODES.ALREADY_EXISTS, 'Ce code compteur existe déjà.');
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = db.collection('meters').doc();

  const data = {
    galleryId: shop.galleryId,
    shopId: input.shopId,
    parentMeterId: input.parentMeterId ?? null,
    type: input.type, // 'MAIN' | 'SUB_METER'
    code: input.code,
    serialNumber: input.serialNumber ?? null,
    name: input.name,
    description: input.description ?? null,
    readingMode: 'MANUAL',
    status: 'ACTIVE',
    initialKwh: Number(input.initialKwh ?? 0),
    lastTotalKwh: Number(input.initialKwh ?? 0),
    lastValidReadingId: null,
    lastReadingAt: null,
    createdAt: now,
    updatedAt: now,
    createdByUserId: actorUserId,
  };

  const batch = db.batch();
  batch.set(ref, data);
  batch.update(shopRef, {
    meterIds: admin.firestore.FieldValue.arrayUnion(ref.id),
    updatedAt: now,
  });
  await batch.commit();
  return { id: ref.id, ...data };
}

async function updateMeter({ meterId, patch, actorUserId }) {
  const ref = db.collection('meters').doc(meterId);
  const snap = await ref.get();
  if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Compteur introuvable.');

  const forbidden = ['lastTotalKwh', 'lastValidReadingId', 'lastReadingAt', 'initialKwh'];
  for (const f of forbidden) {
    if (f in patch) throw new AppError(ERROR_CODES.PERMISSION_DENIED, `Champ interdit : ${f}`);
  }
  const update = {
    ...patch,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedByUserId: actorUserId,
  };
  await ref.update(update);
  return { id: meterId, previous: snap.data() };
}

async function archiveMeter({ meterId, reason, actorUserId }) {
  const ref = db.collection('meters').doc(meterId);
  const snap = await ref.get();
  if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Compteur introuvable.');

  await ref.update({
    status: 'ARCHIVED',
    archivedAt: admin.firestore.FieldValue.serverTimestamp(),
    archivedByUserId: actorUserId,
    archiveReason: reason ?? null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { id: meterId, previous: snap.data() };
}

module.exports = { createMeter, updateMeter, archiveMeter };