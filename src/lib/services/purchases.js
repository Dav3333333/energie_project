import { fb, AppError, ERR } from './base';
import { writeAuditLog, AUDIT_ACTIONS } from './audit';
import { recalculateShopBalance, recalculateMeterBalance } from './balances';
import { generateReceiptNumber } from './counters';

export async function createEnergyPurchase({ input, actorUserId, actorRole, actorGalleryIds = [] }) {
  if (!['SUPER_ADMIN', 'GALLERY_ADMIN'].includes(actorRole)) {
    throw new AppError(ERR.PERMISSION_DENIED, 'Seuls les administrateurs peuvent enregistrer un achat.');
  }
  const meterSnap = await fb.getDoc(fb.doc(fb.db, 'meters', input.meterId));
  if (!meterSnap.exists()) throw new AppError(ERR.NOT_FOUND, 'Compteur introuvable.');
  const meter = meterSnap.data();
  if (meter.status !== 'ACTIVE' || !['MAIN', 'SUB_METER'].includes(meter.type)) {
    throw new AppError(ERR.FAILED_PRECONDITION, 'Le compteur choisi est inactif ou invalide.');
  }
  if (actorRole === 'GALLERY_ADMIN' && !actorGalleryIds.includes(meter.galleryId)) {
    throw new AppError(ERR.PERMISSION_DENIED, 'Cette boutique n’appartient pas à vos galeries.');
  }

  const gallerySnap = await fb.getDoc(fb.doc(fb.db, 'galleries', meter.galleryId));
  if (!gallerySnap.exists()) throw new AppError(ERR.NOT_FOUND, 'Galerie introuvable.');
  const gallery = gallerySnap.data();

  const purchasedKwh = Number(input.purchasedKwh);
  if (!Number.isFinite(purchasedKwh) || purchasedKwh <= 0) {
    throw new AppError(ERR.INVALID_ARGUMENT, 'Quantité kWh invalide.');
  }

  const totalAmount = Number(input.totalAmount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new AppError(ERR.INVALID_ARGUMENT, 'Montant total invalide.');
  }
  const pricePerKwh = Number((totalAmount / purchasedKwh).toFixed(6));
  const currency = input.currency ?? gallery.currency ?? 'USD';
  const existingPurchases = await fb.getDocs(fb.query(
    fb.collection(fb.db, 'energyPurchases'),
    fb.where('meterId', '==', input.meterId),
  ));
  const existingCurrency = existingPurchases.docs
    .map((docSnap) => docSnap.data())
    .find((purchase) => purchase.status === 'VALID' && purchase.currency)?.currency;
  if (existingCurrency && existingCurrency !== currency) {
    throw new AppError(ERR.FAILED_PRECONDITION, `Les achats de ce compteur sont enregistrés en ${existingCurrency}.`);
  }
  const shopId = meter.shopId ?? null;
  const now = fb.serverTimestamp();
  const purchaseDate = input.purchaseDate
    ? fb.Timestamp.fromDate(new Date(input.purchaseDate))
    : fb.Timestamp.now();

  const receiptNumber = await generateReceiptNumber({
    galleryCode: gallery.code,
    date: purchaseDate.toDate(),
  });

  const ref = fb.doc(fb.collection(fb.db, 'energyPurchases'));
  const data = {
    galleryId: meter.galleryId,
    shopId,
    meterId: input.meterId,
    meterName: meter.name ?? meter.code,
    meterType: meter.type,
    receiptNumber,
    purchasedKwh, pricePerKwh, totalAmount,
    currency,
    paymentMethod: input.paymentMethod ?? 'CASH',
    paymentReference: input.paymentReference ?? null,
    receiptFileUrl: input.receiptFileUrl ?? null,
    purchaseDate,
    status: 'VALID',
    createdByUserId: actorUserId,
    cancelledByUserId: null, cancelledAt: null, cancellationReason: null,
    createdAt: now, updatedAt: now,
  };

  await fb.runTransaction(fb.db, async (tx) => {
    tx.set(ref, data);
    tx.update(fb.doc(fb.db, 'meters', input.meterId), { lastPurchaseAt: purchaseDate, updatedAt: now });
    if (shopId) tx.update(fb.doc(fb.db, 'shops', shopId), { lastPurchaseAt: purchaseDate, updatedAt: now });
  });

  let balance = null;
  try {
    balance = await recalculateMeterBalance(input.meterId);
    if (shopId) balance = await recalculateShopBalance(shopId);
  }
  catch (err) { console.error('[createPurchase] recalc failed', err); }

  await writeAuditLog({
    action: AUDIT_ACTIONS.PURCHASE_CREATED,
    entityType: 'energyPurchase', entityId: ref.id,
    galleryId: meter.galleryId, shopId,
    actorUserId, actorRole,
    newData: { receiptNumber, meterId: input.meterId, purchasedKwh, pricePerKwh, totalAmount },
  });

  return { id: ref.id, ...data, balance };
}

export async function cancelEnergyPurchase({ purchaseId, reason, actorUserId, actorRole }) {
  const ref = fb.doc(fb.db, 'energyPurchases', purchaseId);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()) throw new AppError(ERR.NOT_FOUND, 'Achat introuvable.');
  const purchase = snap.data();
  if (purchase.status === 'CANCELLED') {
    throw new AppError(ERR.FAILED_PRECONDITION, 'Achat déjà annulé.');
  }

  const now = fb.serverTimestamp();
  await fb.updateDoc(ref, {
    status: 'CANCELLED',
    cancelledByUserId: actorUserId,
    cancelledAt: now,
    cancellationReason: reason,
    updatedAt: now,
  });

  let balance = null;
  try {
    if (purchase.meterId) balance = await recalculateMeterBalance(purchase.meterId);
    if (purchase.shopId) balance = await recalculateShopBalance(purchase.shopId);
  }
  catch (err) { console.error('[cancelPurchase] recalc failed', err); }

  await writeAuditLog({
    action: AUDIT_ACTIONS.PURCHASE_CANCELLED,
    entityType: 'energyPurchase', entityId: purchaseId,
    galleryId: purchase.galleryId, shopId: purchase.shopId,
    actorUserId, actorRole,
    previousData: { status: 'VALID' }, newData: { status: 'CANCELLED' }, reason,
  });

  return { id: purchaseId, previous: purchase, balance };
}
