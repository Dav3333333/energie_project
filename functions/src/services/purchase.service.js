const { db, admin } = require('../config/admin');
const { AppError, ERROR_CODES } = require('../utils/errors');
const { generateReceiptNumber } = require('./receipt.service');
const { recalculateShopBalance } = require('./balance.service');

async function createPurchase({ input, actorUserId }) {
  const shopRef = db.collection('shops').doc(input.shopId);
  const shopSnap = await shopRef.get();
  if (!shopSnap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Boutique introuvable.');
  const shop = shopSnap.data();

  const gallerySnap = await db.collection('galleries').doc(shop.galleryId).get();
  if (!gallerySnap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Galerie introuvable.');
  const gallery = gallerySnap.data();

  // Prix effectif : fourni explicitement ou prix boutique, sinon prix galerie.
  const pricePerKwh = Number(
    input.pricePerKwh ?? shop.customPricePerKwh ?? gallery.defaultPricePerKwh ?? 0,
  );
  if (!Number.isFinite(pricePerKwh) || pricePerKwh < 0) {
    throw new AppError(ERROR_CODES.INVALID_ARGUMENT, 'Prix kWh invalide.');
  }

  const purchasedKwh = Number(input.purchasedKwh);
  if (!Number.isFinite(purchasedKwh) || purchasedKwh <= 0) {
    throw new AppError(ERROR_CODES.INVALID_ARGUMENT, 'Quantité kWh invalide (> 0).');
  }

  const totalAmount = Number((purchasedKwh * pricePerKwh).toFixed(2));
  const now = admin.firestore.FieldValue.serverTimestamp();
  const purchaseDate = input.purchaseDate
    ? admin.firestore.Timestamp.fromDate(new Date(input.purchaseDate))
    : admin.firestore.Timestamp.now();

  let receiptNumber;
  await db.runTransaction(async (tx) => {
    receiptNumber = await generateReceiptNumber({
      galleryCode: gallery.code,
      transaction: tx,
      date: purchaseDate.toDate(),
    });
  });

  const ref = db.collection('energyPurchases').doc();
  const data = {
    galleryId: shop.galleryId,
    shopId: input.shopId,
    receiptNumber,
    purchasedKwh,
    pricePerKwh,
    totalAmount,
    currency: input.currency ?? gallery.currency ?? 'USD',
    paymentMethod: input.paymentMethod ?? 'CASH',
    paymentReference: input.paymentReference ?? null,
    receiptFileUrl: input.receiptFileUrl ?? null,
    purchaseDate,
    status: 'VALID',
    createdByUserId: actorUserId,
    cancelledByUserId: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.set(ref, data);
  batch.update(shopRef, {
    lastPurchaseAt: purchaseDate,
    updatedAt: now,
  });
  await batch.commit();

  // Recalcul du solde (idempotent, hors batch).
  let balance = null;
  try {
    balance = await recalculateShopBalance(input.shopId);
  } catch (err) {
    console.error('[createPurchase] recalc balance failed:', err);
  }

  return { id: ref.id, ...data, balance };
}

async function cancelPurchase({ purchaseId, reason, actorUserId }) {
  const ref = db.collection('energyPurchases').doc(purchaseId);
  const snap = await ref.get();
  if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Achat introuvable.');
  const purchase = snap.data();

  if (purchase.status === 'CANCELLED') {
    throw new AppError(ERROR_CODES.FAILED_PRECONDITION, 'Achat déjà annulé.');
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.update({
    status: 'CANCELLED',
    cancelledByUserId: actorUserId,
    cancelledAt: now,
    cancellationReason: reason,
    updatedAt: now,
  });

  let balance = null;
  try {
    balance = await recalculateShopBalance(purchase.shopId);
  } catch (err) {
    console.error('[cancelPurchase] recalc balance failed:', err);
  }

  return { id: purchaseId, previous: purchase, balance };
}

module.exports = { createPurchase, cancelPurchase };