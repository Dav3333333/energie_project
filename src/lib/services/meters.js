import { fb, AppError, ERR } from './base';
import { writeAuditLog, AUDIT_ACTIONS } from './audit';

export async function createMeter({ input, actorUserId, actorRole }) {
  const shopSnap = await fb.getDoc(fb.doc(fb.db, 'shops', input.shopId));
  if (!shopSnap.exists()) throw new AppError(ERR.NOT_FOUND, 'Boutique introuvable.');
  const shop = shopSnap.data();

  const dup = await fb.getDocs(fb.query(
    fb.collection(fb.db, 'meters'),
    fb.where('galleryId', '==', shop.galleryId),
    fb.where('code', '==', input.code),
    fb.limit(1),
  ));
  if (!dup.empty) throw new AppError(ERR.ALREADY_EXISTS, 'Code compteur déjà utilisé.');

  const now = fb.serverTimestamp();
  const ref = fb.doc(fb.collection(fb.db, 'meters'));
  const data = {
    galleryId: shop.galleryId, shopId: input.shopId,
    parentMeterId: input.parentMeterId ?? null,
    type: input.type, code: input.code,
    serialNumber: input.serialNumber ?? null, name: input.name,
    description: input.description ?? null,
    readingMode: 'MANUAL', status: 'ACTIVE',
    initialKwh: Number(input.initialKwh ?? 0),
    lastTotalKwh: Number(input.initialKwh ?? 0),
    lastValidReadingId: null, lastReadingAt: null,
    createdAt: now, updatedAt: now, createdByUserId: actorUserId,
  };

  await fb.runTransaction(fb.db, async (tx) => {
    tx.set(ref, data);
    tx.update(fb.doc(fb.db, 'shops', input.shopId), {
      meterIds: [...(shop.meterIds ?? []), ref.id],
      updatedAt: now,
    });
  });

  await writeAuditLog({
    action: AUDIT_ACTIONS.METER_CREATED,
    entityType: 'meter', entityId: ref.id,
    galleryId: shop.galleryId, shopId: input.shopId,
    actorUserId, actorRole, newData: { code: input.code, type: input.type },
  });
  return { id: ref.id, ...data };
}

export async function updateMeter({ meterId, patch, actorUserId, actorRole }) {
  const forbidden = ['lastTotalKwh', 'lastValidReadingId', 'lastReadingAt', 'initialKwh'];
  for (const f of forbidden) {
    if (f in patch) throw new AppError(ERR.PERMISSION_DENIED, `Champ interdit : ${f}`);
  }
  const ref = fb.doc(fb.db, 'meters', meterId);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()) throw new AppError(ERR.NOT_FOUND, 'Compteur introuvable.');

  await fb.updateDoc(ref, {
    ...patch, updatedAt: fb.serverTimestamp(), updatedByUserId: actorUserId,
  });

  await writeAuditLog({
    action: AUDIT_ACTIONS.METER_UPDATED,
    entityType: 'meter', entityId: meterId,
    galleryId: snap.data().galleryId, shopId: snap.data().shopId,
    actorUserId, actorRole, previousData: snap.data(), newData: patch,
  });
}

export async function archiveMeter({ meterId, reason, actorUserId, actorRole }) {
  const ref = fb.doc(fb.db, 'meters', meterId);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()) throw new AppError(ERR.NOT_FOUND, 'Compteur introuvable.');

  await fb.updateDoc(ref, {
    status: 'ARCHIVED', archivedAt: fb.serverTimestamp(),
    archivedByUserId: actorUserId, archiveReason: reason ?? null,
    updatedAt: fb.serverTimestamp(),
  });

  await writeAuditLog({
    action: AUDIT_ACTIONS.METER_ARCHIVED,
    entityType: 'meter', entityId: meterId,
    galleryId: snap.data().galleryId, shopId: snap.data().shopId,
    actorUserId, actorRole, reason,
  });
}