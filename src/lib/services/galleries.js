import { fb, AppError, ERR } from './base';
import { writeAuditLog, AUDIT_ACTIONS } from './audit';

export async function createGallery({ input, actorUserId, actorRole }) {
  const now = fb.serverTimestamp();
  const ref = fb.doc(fb.collection(fb.db, 'galleries'));
  const code = `GAL-${ref.id.toUpperCase()}`;
  const data = {
    name: input.name, code,
    address: input.address ?? '', city: input.city ?? '', country: input.country ?? '',
    phone: input.phone ?? null, email: input.email ?? null,
    currency: input.currency,
    defaultPricePerKwh: Number(input.defaultPricePerKwh ?? 0),
    lowCreditThresholdKwh: Number(input.lowCreditThresholdKwh ?? 50),
    criticalCreditThresholdKwh: Number(input.criticalCreditThresholdKwh ?? 10),
    status: 'ACTIVE',
    mainPowerStatus: 'UNKNOWN', mainEnergySource: 'UNKNOWN',
    createdAt: now, updatedAt: now, createdByUserId: actorUserId,
  };
  await fb.setDoc(ref, data);

  await writeAuditLog({
    action: AUDIT_ACTIONS.GALLERY_CREATED,
    entityType: 'gallery', entityId: ref.id,
    galleryId: ref.id, actorUserId, actorRole,
    newData: { name: input.name, code },
  });
  return { id: ref.id, ...data };
}

export async function updateGallery({ galleryId, patch, actorUserId, actorRole }) {
  const ref = fb.doc(fb.db, 'galleries', galleryId);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()) throw new AppError(ERR.NOT_FOUND, 'Galerie introuvable.');
  const previous = snap.data();

  await fb.updateDoc(ref, {
    ...patch, updatedAt: fb.serverTimestamp(), updatedByUserId: actorUserId,
  });

  await writeAuditLog({
    action: AUDIT_ACTIONS.GALLERY_UPDATED,
    entityType: 'gallery', entityId: galleryId, galleryId,
    actorUserId, actorRole, previousData: previous, newData: patch,
  });
}

export async function archiveGallery({ galleryId, reason, actorUserId, actorRole }) {
  const ref = fb.doc(fb.db, 'galleries', galleryId);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()) throw new AppError(ERR.NOT_FOUND, 'Galerie introuvable.');

  await fb.updateDoc(ref, {
    status: 'ARCHIVED',
    archivedAt: fb.serverTimestamp(),
    archivedByUserId: actorUserId,
    archiveReason: reason ?? null,
    updatedAt: fb.serverTimestamp(),
  });

  await writeAuditLog({
    action: AUDIT_ACTIONS.GALLERY_ARCHIVED,
    entityType: 'gallery', entityId: galleryId, galleryId,
    actorUserId, actorRole, reason,
  });
}
