import { fb, AppError, ERR } from './base';
import { writeAuditLog, AUDIT_ACTIONS } from './audit';
import { recalculateShopBalance } from './balances';
import { generateReceiptNumber } from './counters';

export async function createEnergyPurchase({ input, actorUserId, actorRole }) {
  const shopSnap = await fb.getDoc(fb.doc(fb.db, 'shops', input.shopId));
  if (!shopSnap.exists()) throw new AppError(ERR.NOT_FOUND, 'Boutique introuvable.');
  const shop = shopSnap.data();

  const gallerySnap = await fb.getDoc(fb.doc(fb.db, 'galleries', shop.galleryId));
  if (!gallerySnap.exists()) throw new AppError(ERR.NOT_FOUND, 'Galerie introuvable.');
  const gallery = gallerySnap.data();

  const pricePerKwh = Number(
    input.pricePerKwh ?? shop.customPricePerKwh ?? gallery.defaultPricePerKwh ?? 0,
  );
  if (!Number.isFinite(pricePerKwh) || pricePerKwh < 0) {
    throw new AppError(ERR.INVALID_ARGUMENT, 'Prix kWh invalide.');
  }

  const purchasedKwh = Number(input.purchasedKwh);
  if (!Number.isFinite(purchasedKwh) || purchasedKwh <= 0) {
    throw new AppError(ERR.INVALID_ARGUMENT, 'Quantité kWh invalide.');
  }

  const totalAmount = Number((purchasedKwh * pricePerKwh).toFixed(2));
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
    galleryId: shop.galleryId,
    shopId: input.shopId,
    receiptNumber,
    purchasedKwh, pricePerKwh, totalAmount,
    currency: input.currency ?? gallery.currency ?? 'USD',
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
    tx.update(fb.doc(fb.db, 'shops', input.shopId), {
      lastPurchaseAt: purchaseDate, updatedAt: now,
    });
  });

  let balance = null;
  try { balance = await recalculateShopBalance(input.shopId); }
  catch (err) { console.error('[createPurchase] recalc failed', err); }

  await writeAuditLog({
    action: AUDIT_ACTIONS.PURCHASE_CREATED,
    entityType: 'energyPurchase', entityId: ref.id,
    galleryId: shop.galleryId, shopId: input.shopId,
    actorUserId, actorRole,
    newData: { receiptNumber, purchasedKwh, pricePerKwh, totalAmount },
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
  try { balance = await recalculateShopBalance(purchase.shopId); }
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