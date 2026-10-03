import { fb, AppError, ERR } from './base';
import { writeAuditLog, AUDIT_ACTIONS } from './audit';
import { generateMeterCode } from './counters';

export async function createMeter({ input, actorUserId, actorRole }) {
  if (!['SUPER_ADMIN', 'GALLERY_ADMIN'].includes(actorRole)) {
    throw new AppError(ERR.PERMISSION_DENIED, 'Seul un administrateur peut créer un compteur.');
  }
  let shop = null;
  if (input.type === 'SUB_METER') {
    if (!input.shopId) throw new AppError(ERR.INVALID_ARGUMENT, 'Une boutique est requise pour un sous-compteur.');
    const shopSnap = await fb.getDoc(fb.doc(fb.db, 'shops', input.shopId));
    if (!shopSnap.exists()) throw new AppError(ERR.NOT_FOUND, 'Boutique introuvable.');
    shop = shopSnap.data();
    if (shop.galleryId !== input.galleryId) {
      throw new AppError(ERR.INVALID_ARGUMENT, 'La boutique doit appartenir à la galerie sélectionnée.');
    }
  }

  let parentMeter = null;
  if (input.type === 'SUB_METER' && input.parentMeterId) {
    const parentSnap = await fb.getDoc(fb.doc(fb.db, 'meters', input.parentMeterId));
    if (!parentSnap.exists()) throw new AppError(ERR.NOT_FOUND, 'Compteur général parent introuvable.');
    parentMeter = parentSnap.data();
    if (parentMeter.galleryId !== input.galleryId || parentMeter.type !== 'MAIN' || parentMeter.status !== 'ACTIVE') {
      throw new AppError(ERR.INVALID_ARGUMENT, 'Le compteur parent doit être un compteur général actif de cette galerie.');
    }
  }

  const now = fb.serverTimestamp();
  const ref = fb.doc(fb.collection(fb.db, 'meters'));
  const code = generateMeterCode({ galleryCode: input.galleryCode, galleryId: input.galleryId, uniqueId: ref.id });
  const data = {
    galleryId: input.galleryId,
    shopId: shop ? input.shopId : null,
    parentMeterId: parentMeter ? input.parentMeterId : null,
    type: input.type, code,
    serialNumber: input.serialNumber ?? null, name: input.name,
    description: input.description ?? null,
    readingMode: 'MANUAL', status: 'ACTIVE',
    initialKwh: Number(input.initialKwh ?? 0),
    lastTotalKwh: Number(input.initialKwh ?? 0),
    lastValidReadingId: null, lastReadingAt: null,
    createdAt: now, updatedAt: now, createdByUserId: actorUserId,
  };

  if (shop) {
    await fb.runTransaction(fb.db, async (tx) => {
      tx.set(ref, data);
      tx.update(fb.doc(fb.db, 'shops', input.shopId), {
        meterIds: [...new Set([...(shop.meterIds ?? []), ref.id])],
        updatedAt: now,
      });
    });
  } else {
    await fb.setDoc(ref, data);
  }

  await writeAuditLog({
    action: AUDIT_ACTIONS.METER_CREATED,
    entityType: 'meter', entityId: ref.id,
    galleryId: input.galleryId, shopId: input.shopId ?? null,
    actorUserId, actorRole, newData: { code, type: input.type },
  });
  return { id: ref.id, ...data };
}

export async function updateMeter({ meterId, patch, actorUserId, actorRole, actorGalleryIds = [] }) {
  if (!['SUPER_ADMIN', 'GALLERY_ADMIN'].includes(actorRole)) {
    throw new AppError(ERR.PERMISSION_DENIED, 'Seul un administrateur peut modifier un compteur.');
  }
  const allowedFields = ['name', 'serialNumber', 'description'];
  if (Object.keys(patch).some((field) => !allowedFields.includes(field))) {
    throw new AppError(ERR.PERMISSION_DENIED, 'Les champs techniques du compteur ne peuvent pas être modifiés ici.');
  }
  const ref = fb.doc(fb.db, 'meters', meterId);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()) throw new AppError(ERR.NOT_FOUND, 'Compteur introuvable.');
  if (actorRole === 'GALLERY_ADMIN' && !actorGalleryIds.includes(snap.data().galleryId)) {
    throw new AppError(ERR.PERMISSION_DENIED, 'Vous pouvez modifier uniquement les compteurs de votre galerie.');
  }

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
  if (!['SUPER_ADMIN', 'GALLERY_ADMIN'].includes(actorRole)) {
    throw new AppError(ERR.PERMISSION_DENIED, 'Seul un administrateur peut supprimer un compteur.');
  }
  const ref = fb.doc(fb.db, 'meters', meterId);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()) throw new AppError(ERR.NOT_FOUND, 'Compteur introuvable.');

  const meter = snap.data();
  if (meter.status === 'ARCHIVED') return;
  await fb.updateDoc(ref, {
    status: 'ARCHIVED', archivedAt: fb.serverTimestamp(),
    archivedByUserId: actorUserId, archiveReason: reason ?? null,
    updatedAt: fb.serverTimestamp(),
  });

  await writeAuditLog({
    action: AUDIT_ACTIONS.METER_ARCHIVED,
    entityType: 'meter', entityId: meterId,
    galleryId: meter.galleryId, shopId: meter.shopId,
    actorUserId, actorRole, reason,
  });
}
