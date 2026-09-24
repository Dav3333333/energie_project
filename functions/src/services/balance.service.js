const { db, admin } = require('../config/admin');
const {
  DEFAULT_LOW_THRESHOLD_KWH,
  DEFAULT_CRITICAL_THRESHOLD_KWH,
  DEFAULT_AVERAGE_PERIOD_DAYS,
} = require('../constants/app');
const { BALANCE_STATUS } = require('../constants/statuses');

/**
 * Recalcule le solde énergétique d'une boutique à partir des seuls documents VALID.
 * - Achats : energyPurchases (status=VALID)
 * - Relevés : readings (status=VALID, consumptionKwh != null)
 * Retourne un objet diagnostic — échoue silencieusement en cas d'erreur non bloquante.
 */
async function recalculateShopBalance(shopId, { transaction = null } = {}) {
  const shopRef = db.collection('shops').doc(shopId);

  const computeFn = async (tx) => {
    const shopSnap = tx ? await tx.get(shopRef) : await shopRef.get();
    if (!shopSnap.exists) {
      throw new Error(`Shop ${shopId} introuvable.`);
    }
    const shop = shopSnap.data();
    const galleryId = shop.galleryId;

    // ----- Achats VALID -----
    const purchasesQuery = db
      .collection('energyPurchases')
      .where('shopId', '==', shopId)
      .where('status', '==', 'VALID');
    const purchasesSnap = tx ? await tx.get(purchasesQuery) : await purchasesQuery.get();
    const purchases = purchasesSnap.docs.map((d) => d.data());
    const totalPurchasedKwh = purchases.reduce((s, p) => s + Number(p.purchasedKwh ?? 0), 0);

    // ----- Relevés VALID -----
    const readingsQuery = db
      .collection('readings')
      .where('shopId', '==', shopId)
      .where('status', '==', 'VALID');
    const readingsSnap = tx ? await tx.get(readingsQuery) : await readingsQuery.get();
    const readings = readingsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((r) => typeof r.consumptionKwh === 'number');
    const totalConsumedKwh = readings.reduce((s, r) => s + Number(r.consumptionKwh), 0);

    // ----- Tarif actif -----
    let activePricePerKwh = shop.activePricePerKwh ?? null;
    if (activePricePerKwh == null) {
      const gallerySnap = tx
        ? await tx.get(db.collection('galleries').doc(galleryId))
        : await db.collection('galleries').doc(galleryId).get();
      const gallery = gallerySnap.data() ?? {};
      // Tarif boutique personnalisé sinon tarif actif galerie sinon défaut.
      if (shop.customPricePerKwh != null) activePricePerKwh = shop.customPricePerKwh;
      else activePricePerKwh = Number(gallery.defaultPricePerKwh ?? 0);
    }

    // ----- Calculs -----
    const remainingKwh = Number((totalPurchasedKwh - totalConsumedKwh).toFixed(3));
    const remainingAmount = Number((remainingKwh * Number(activePricePerKwh ?? 0)).toFixed(2));

    // ----- Moyenne journalière (fenêtre glissante) -----
    const periodDays = shop.averagePeriodDays ?? DEFAULT_AVERAGE_PERIOD_DAYS;
    const sorted = readings
      .filter((r) => r.readingDate)
      .sort((a, b) => toMillis(a.readingDate) - toMillis(b.readingDate));

    let averageDailyConsumptionKwh = null;
    if (sorted.length >= 2) {
      const now = Date.now();
      const cutoff = now - periodDays * 24 * 3600 * 1000;
      const inWindow = sorted.filter((r) => toMillis(r.readingDate) >= cutoff);
      const used = inWindow.length >= 2 ? inWindow : sorted.slice(-2);
      const total = used.slice(1).reduce((s, r) => s + r.consumptionKwh, 0);
      const spanDays =
        (toMillis(used[used.length - 1].readingDate) - toMillis(used[0].readingDate)) /
        (24 * 3600 * 1000);
      if (spanDays >= 2) {
        const avg = total / spanDays;
        if (avg >= 0.01) averageDailyConsumptionKwh = Number(avg.toFixed(3));
      }
    }

    const estimatedDaysRemaining =
      averageDailyConsumptionKwh && remainingKwh > 0
        ? Math.ceil(remainingKwh / averageDailyConsumptionKwh)
        : remainingKwh <= 0
        ? 0
        : null;

    const estimatedDepletionDate =
      estimatedDaysRemaining != null
        ? admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + estimatedDaysRemaining * 24 * 3600 * 1000),
          )
        : null;

    // ----- Seuils & statut -----
    const lowThreshold =
      shop.lowCreditThresholdKwh ?? DEFAULT_LOW_THRESHOLD_KWH;
    const criticalThreshold =
      shop.criticalCreditThresholdKwh ?? DEFAULT_CRITICAL_THRESHOLD_KWH;

    let balanceStatus;
    if (remainingKwh <= 0) balanceStatus = BALANCE_STATUS.EXHAUSTED;
    else if (remainingKwh <= criticalThreshold) balanceStatus = BALANCE_STATUS.CRITICAL;
    else if (remainingKwh <= lowThreshold) balanceStatus = BALANCE_STATUS.LOW;
    else balanceStatus = BALANCE_STATUS.NORMAL;

    const update = {
      totalPurchasedKwh: Number(totalPurchasedKwh.toFixed(3)),
      totalConsumedKwh: Number(totalConsumedKwh.toFixed(3)),
      remainingKwh,
      remainingAmount,
      activePricePerKwh: Number(activePricePerKwh ?? 0),
      averageDailyConsumptionKwh,
      estimatedDaysRemaining,
      estimatedDepletionDate,
      balanceStatus,
      lastBalanceCalculatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (tx) tx.update(shopRef, update);
    else await shopRef.update(update);

    return { shopId, ...update };
  };

  if (transaction) return computeFn(transaction);
  return db.runTransaction(computeFn);
}

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  return new Date(ts).getTime();
}

module.exports = { recalculateShopBalance };