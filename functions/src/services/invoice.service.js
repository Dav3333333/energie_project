const { db, admin } = require('../config/admin');
const { AppError, ERROR_CODES } = require('../utils/errors');
const { recalculateShopBalance } = require('./balance.service');

/**
 * Génère un numéro de facture séquentiel par galerie et par mois.
 * Format : FAC-{galleryCode}-{YYYYMM}-{seq,5}
 */
async function generateInvoiceNumber({ galleryCode, transaction, date = new Date() }) {
  const yyyymm = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const counterId = `invoice_${galleryCode}_${yyyymm}`;
  const ref = db.collection('counters').doc(counterId);

  const snap = await transaction.get(ref);
  const current = snap.exists ? Number(snap.data().value ?? 0) : 0;
  const next = current + 1;
  transaction.set(ref, { value: next, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

  return `FAC-${galleryCode}-${yyyymm}-${String(next).padStart(5, '0')}`;
}

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  return new Date(ts).getTime();
}

/**
 * Calcule les totaux d'une facture à partir des relevés et achats VALID.
 */
async function computeInvoiceTotals({ shopId, periodStart, periodEnd }) {
  const shopSnap = await db.collection('shops').doc(shopId).get();
  if (!shopSnap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Boutique introuvable.');
  const shop = shopSnap.data();

  const ps = toMillis(periodStart);
  const pe = toMillis(periodEnd);

  // Relevés dans la période
  const readingsSnap = await db
    .collection('readings')
    .where('shopId', '==', shopId)
    .where('status', '==', 'VALID')
    .orderBy('readingDate', 'asc')
    .get();

  const allReadings = readingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const inPeriod = allReadings.filter((r) => {
    const t = toMillis(r.readingDate);
    return t >= ps && t <= pe;
  });
  const beforePeriod = allReadings.filter((r) => toMillis(r.readingDate) < ps);

  const openingMeterKwh = beforePeriod.length
    ? beforePeriod[beforePeriod.length - 1].totalKwh
    : allReadings[0]?.previousTotalKwh ?? shop.initialKwh ?? 0;
  const closingMeterKwh = inPeriod.length
    ? inPeriod[inPeriod.length - 1].totalKwh
    : openingMeterKwh;
  const consumedKwh = Number(
    inPeriod.reduce((s, r) => s + Number(r.consumptionKwh ?? 0), 0).toFixed(3),
  );

  // Achats dans la période
  const purchasesSnap = await db
    .collection('energyPurchases')
    .where('shopId', '==', shopId)
    .where('status', '==', 'VALID')
    .get();
  const purchasesInPeriod = purchasesSnap.docs
    .map((d) => d.data())
    .filter((p) => {
      const t = toMillis(p.purchaseDate);
      return t >= ps && t <= pe;
    });
  const purchasedKwh = Number(
    purchasesInPeriod.reduce((s, p) => s + Number(p.purchasedKwh ?? 0), 0).toFixed(3),
  );

  // Prix actif
  const gallerySnap = await db.collection('galleries').doc(shop.galleryId).get();
  const gallery = gallerySnap.data() ?? {};
  const pricePerKwh = Number(
    shop.customPricePerKwh ?? gallery.defaultPricePerKwh ?? 0,
  );

  // Solde recalculé (fiable)
  const balance = await recalculateShopBalance(shopId);

  const consumedAmount = Number((consumedKwh * pricePerKwh).toFixed(2));
  const remainingAmount = Number((balance.remainingKwh * pricePerKwh).toFixed(2));

  return {
    shop,
    gallery,
    openingMeterKwh,
    closingMeterKwh,
    consumedKwh,
    purchasedKwh,
    remainingKwh: balance.remainingKwh,
    pricePerKwh,
    consumedAmount,
    remainingAmount,
    currency: shop.customPricePerKwh ? gallery.currency : gallery.currency ?? 'USD',
  };
}

module.exports = { generateInvoiceNumber, computeInvoiceTotals };