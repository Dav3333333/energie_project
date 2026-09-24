const { db, admin } = require('../config/admin');
const { AppError, ERROR_CODES } = require('../utils/errors');

const GALLERY_STATUS = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];

async function createGallery({ input, actorUserId }) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = db.collection('galleries').doc();

  // Unicité du code dans la collection.
  const dup = await db.collection('galleries').where('code', '==', input.code).limit(1).get();
  if (!dup.empty) {
    throw new AppError(ERROR_CODES.ALREADY_EXISTS, 'Ce code de galerie existe déjà.');
  }

  const data = {
    name: input.name,
    code: input.code,
    address: input.address ?? '',
    city: input.city ?? '',
    country: input.country ?? '',
    phone: input.phone ?? null,
    email: input.email ?? null,
    currency: input.currency,
    defaultPricePerKwh: Number(input.defaultPricePerKwh ?? 0),
    lowCreditThresholdKwh: Number(input.lowCreditThresholdKwh ?? 50),
    criticalCreditThresholdKwh: Number(input.criticalCreditThresholdKwh ?? 10),
    status: 'ACTIVE',
    mainPowerStatus: 'UNKNOWN',
    mainEnergySource: 'UNKNOWN',
    createdAt: now,
    updatedAt: now,
    createdByUserId: actorUserId,
  };

  await ref.set(data);
  return { id: ref.id, ...data };
}

async function updateGallery({ galleryId, patch, actorUserId }) {
  const ref = db.collection('galleries').doc(galleryId);
  const snap = await ref.get();
  if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Galerie introuvable.');

  if (patch.status && !GALLERY_STATUS.includes(patch.status)) {
    throw new AppError(ERROR_CODES.INVALID_ARGUMENT, 'Statut invalide.');
  }

  const update = {
    ...patch,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedByUserId: actorUserId,
  };
  delete update.id;
  await ref.update(update);
  return { id: galleryId, previous: snap.data(), updated: update };
}

async function archiveGallery({ galleryId, reason, actorUserId }) {
  const ref = db.collection('galleries').doc(galleryId);
  const snap = await ref.get();
  if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Galerie introuvable.');

  await ref.update({
    status: 'ARCHIVED',
    archivedAt: admin.firestore.FieldValue.serverTimestamp(),
    archivedByUserId: actorUserId,
    archiveReason: reason ?? null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { id: galleryId, previous: snap.data() };
}

module.exports = { createGallery, updateGallery, archiveGallery };