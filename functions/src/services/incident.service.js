const { db, admin } = require('../config/admin');
const { AppError, ERROR_CODES } = require('../utils/errors');

const INCIDENT_STATUS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const INCIDENT_PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const INCIDENT_CATEGORY = ['METER', 'POWER', 'BILLING', 'OTHER'];

async function createIncident({ input, actorUserId }) {
  const shopSnap = input.shopId
    ? await db.collection('shops').doc(input.shopId).get()
    : null;
  if (input.shopId && !shopSnap.exists) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Boutique introuvable.');
  }

  const galleryId = input.galleryId ?? shopSnap?.data()?.galleryId;
  if (!galleryId) {
    throw new AppError(ERROR_CODES.INVALID_ARGUMENT, 'Galerie requise.');
  }

  if (!INCIDENT_CATEGORY.includes(input.category)) {
    throw new AppError(ERROR_CODES.INVALID_ARGUMENT, 'Catégorie invalide.');
  }
  if (!INCIDENT_PRIORITY.includes(input.priority)) {
    throw new AppError(ERROR_CODES.INVALID_ARGUMENT, 'Priorité invalide.');
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = db.collection('incidents').doc();
  const data = {
    galleryId,
    shopId: input.shopId ?? null,
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority,
    status: 'OPEN',
    createdByUserId: actorUserId,
    assignedToUserId: input.assignedToUserId ?? null,
    resolutionNotes: null,
    openedAt: now,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(data);
  return { id: ref.id, ...data };
}

async function updateIncidentStatus({ incidentId, input, actorUserId }) {
  const ref = db.collection('incidents').doc(incidentId);
  const snap = await ref.get();
  if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Incident introuvable.');

  if (!INCIDENT_STATUS.includes(input.status)) {
    throw new AppError(ERROR_CODES.INVALID_ARGUMENT, 'Statut invalide.');
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const update = {
    status: input.status,
    updatedAt: now,
    updatedByUserId: actorUserId,
  };

  if (input.assignedToUserId !== undefined) {
    update.assignedToUserId = input.assignedToUserId;
  }
  if (input.status === 'RESOLVED' || input.status === 'CLOSED') {
    update.resolvedAt = now;
    update.resolutionNotes = input.resolutionNotes ?? null;
  } else if (input.resolutionNotes !== undefined) {
    update.resolutionNotes = input.resolutionNotes;
  }

  await ref.update(update);
  return { id: incidentId, previous: snap.data(), updated: update };
}

module.exports = { createIncident, updateIncidentStatus, INCIDENT_STATUS, INCIDENT_PRIORITY, INCIDENT_CATEGORY };