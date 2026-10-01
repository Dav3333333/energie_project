import { fb, AppError, ERR } from './base';
import { writeAuditLog, AUDIT_ACTIONS } from './audit';

const INCIDENT_STATUS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const INCIDENT_PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const INCIDENT_CATEGORY = ['METER', 'POWER', 'BILLING', 'OTHER'];

export async function createIncident({ input, actorUserId, actorRole }) {
  const shopSnap = input.shopId
    ? await fb.getDoc(fb.doc(fb.db, 'shops', input.shopId))
    : null;
  if (input.shopId && !shopSnap.exists()) throw new AppError(ERR.NOT_FOUND, 'Boutique introuvable.');

  const galleryId = input.galleryId ?? shopSnap?.data()?.galleryId;
  if (!galleryId) throw new AppError(ERR.INVALID_ARGUMENT, 'Galerie requise.');
  if (!INCIDENT_CATEGORY.includes(input.category)) throw new AppError(ERR.INVALID_ARGUMENT, 'Catégorie invalide.');
  if (!INCIDENT_PRIORITY.includes(input.priority)) throw new AppError(ERR.INVALID_ARGUMENT, 'Priorité invalide.');

  const now = fb.serverTimestamp();
  const ref = fb.doc(fb.collection(fb.db, 'incidents'));
  const data = {
    galleryId, shopId: input.shopId ?? null,
    title: input.title, description: input.description,
    category: input.category, priority: input.priority,
    status: 'OPEN',
    createdByUserId: actorUserId,
    assignedToUserId: input.assignedToUserId ?? null,
    resolutionNotes: null,
    openedAt: now, resolvedAt: null,
    createdAt: now, updatedAt: now,
  };
  await fb.setDoc(ref, data);

  await writeAuditLog({
    action: AUDIT_ACTIONS.INCIDENT_CREATED,
    entityType: 'incident', entityId: ref.id,
    galleryId, shopId: data.shopId,
    actorUserId, actorRole,
    newData: { title: data.title, category: data.category, priority: data.priority },
  });
  return { id: ref.id, ...data };
}

export async function updateIncidentStatus({ incidentId, input, actorUserId, actorRole }) {
  const ref = fb.doc(fb.db, 'incidents', incidentId);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()) throw new AppError(ERR.NOT_FOUND, 'Incident introuvable.');
  const previous = snap.data();

  if (!INCIDENT_STATUS.includes(input.status)) throw new AppError(ERR.INVALID_ARGUMENT, 'Statut invalide.');

  const now = fb.serverTimestamp();
  const update = { status: input.status, updatedAt: now, updatedByUserId: actorUserId };
  if (input.assignedToUserId !== undefined) update.assignedToUserId = input.assignedToUserId;
  if (input.status === 'RESOLVED' || input.status === 'CLOSED') {
    update.resolvedAt = now;
    update.resolutionNotes = input.resolutionNotes ?? null;
  } else if (input.resolutionNotes !== undefined) {
    update.resolutionNotes = input.resolutionNotes;
  }
  await fb.updateDoc(ref, update);

  await writeAuditLog({
    action: AUDIT_ACTIONS.INCIDENT_STATUS_UPDATED,
    entityType: 'incident', entityId: incidentId,
    galleryId: previous.galleryId, shopId: previous.shopId,
    actorUserId, actorRole,
    previousData: { status: previous.status }, newData: { status: input.status },
  });
}