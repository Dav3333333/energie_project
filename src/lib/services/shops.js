import { fb, AppError, ERR } from './base';
import { writeAuditLog, AUDIT_ACTIONS } from './audit';

export async function createShop({ input, actorUserId, actorRole }) {
  const gallerySnap = await fb.getDoc(fb.doc(fb.db, 'galleries', input.galleryId));
  if (!gallerySnap.exists()) throw new AppError(ERR.NOT_FOUND, 'Galerie introuvable.');

  const now = fb.serverTimestamp();
  const ref = fb.doc(fb.collection(fb.db, 'shops'));
  const code = `SHOP-${ref.id.toUpperCase()}`;
  const data = {
    galleryId: input.galleryId,
    name: input.name, code,
    description: input.description ?? null, location: input.location ?? null,
    ownerIds: input.ownerIds ?? [], workerIds: input.workerIds ?? [], meterIds: [],
    status: 'ACTIVE',
    customPricePerKwh: input.customPricePerKwh ?? null,
    lowCreditThresholdKwh: input.lowCreditThresholdKwh ?? null,
    criticalCreditThresholdKwh: input.criticalCreditThresholdKwh ?? null,
    currentPowerStatus: 'UNKNOWN', currentEnergySource: 'UNKNOWN',
    totalPurchasedKwh: 0, totalConsumedKwh: 0, remainingKwh: 0, remainingAmount: 0,
    activePricePerKwh: Number(gallerySnap.data().defaultPricePerKwh ?? 0),
    averageDailyConsumptionKwh: null, estimatedDaysRemaining: null,
    estimatedDepletionDate: null, balanceStatus: 'UNKNOWN',
    lastReadingAt: null, lastPurchaseAt: null, lastBalanceCalculatedAt: null,
    createdAt: now, updatedAt: now, createdByUserId: actorUserId,
  };
  await fb.setDoc(ref, data);

  await writeAuditLog({
    action: AUDIT_ACTIONS.SHOP_CREATED,
    entityType: 'shop', entityId: ref.id, galleryId: input.galleryId, shopId: ref.id,
    actorUserId, actorRole, newData: { name: input.name, code },
  });
  return { id: ref.id, ...data };
}

export async function updateShop({ shopId, patch, actorUserId, actorRole }) {
  const forbidden = [
    'totalPurchasedKwh','totalConsumedKwh','remainingKwh','remainingAmount',
    'averageDailyConsumptionKwh','estimatedDaysRemaining','estimatedDepletionDate',
    'balanceStatus','activePricePerKwh','lastBalanceCalculatedAt',
    'lastReadingAt','lastPurchaseAt',
  ];
  for (const f of forbidden) {
    if (f in patch) throw new AppError(ERR.PERMISSION_DENIED, `Champ interdit : ${f}`);
  }

  const ref = fb.doc(fb.db, 'shops', shopId);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()) throw new AppError(ERR.NOT_FOUND, 'Boutique introuvable.');

  await fb.updateDoc(ref, {
    ...patch, updatedAt: fb.serverTimestamp(), updatedByUserId: actorUserId,
  });

  await writeAuditLog({
    action: AUDIT_ACTIONS.SHOP_UPDATED,
    entityType: 'shop', entityId: shopId, shopId,
    galleryId: snap.data().galleryId,
    actorUserId, actorRole, previousData: snap.data(), newData: patch,
  });
}

export async function archiveShop({ shopId, reason, actorUserId, actorRole }) {
  const ref = fb.doc(fb.db, 'shops', shopId);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()) throw new AppError(ERR.NOT_FOUND, 'Boutique introuvable.');

  await fb.updateDoc(ref, {
    status: 'ARCHIVED', archivedAt: fb.serverTimestamp(),
    archivedByUserId: actorUserId, archiveReason: reason ?? null,
    updatedAt: fb.serverTimestamp(),
  });

  await writeAuditLog({
    action: AUDIT_ACTIONS.SHOP_ARCHIVED,
    entityType: 'shop', entityId: shopId, shopId,
    galleryId: snap.data().galleryId,
    actorUserId, actorRole, reason,
  });
}
