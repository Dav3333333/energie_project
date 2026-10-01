import { fb, toMillis, AppError, ERR } from './base';
import { createAlertIfNotExists } from './alerts';

const DEFAULT_LOW = 50;
const DEFAULT_CRITICAL = 10;
const DEFAULT_PERIOD_DAYS = 7;

/**
 * Recalcule le solde d'une boutique et met à jour shops/{shopId}.
 * Lecture seule des achats/relevés VALID + écriture du solde.
 * Déclenche les alertes LOW/CRITICAL/EXHAUSTED si nécessaire.
 */
export async function recalculateShopBalance(shopId, { transaction = null } = {}) {
  const shopRef = fb.doc(fb.db, 'shops', shopId);

  const compute = async (tx) => {
    const shopSnap = tx ? await tx.get(shopRef) : await fb.getDoc(shopRef);
    if (!shopSnap.exists()) throw new AppError(ERR.NOT_FOUND, 'Boutique introuvable.');
    const shop = shopSnap.data();
    const galleryId = shop.galleryId;

    // Achats VALID
    const purchasesQ = fb.query(
      fb.collection(fb.db, 'energyPurchases'),
      fb.where('shopId', '==', shopId),
      fb.where('status', '==', 'VALID'),
    );
    const purchasesSnap = tx ? await tx.get(purchasesQ) : await fb.getDocs(purchasesQ);
    const purchases = purchasesSnap.docs.map((d) => d.data());
    const totalPurchasedKwh = purchases.reduce((s, p) => s + Number(p.purchasedKwh ?? 0), 0);

    // Relevés VALID
    const readingsQ = fb.query(
      fb.collection(fb.db, 'readings'),
      fb.where('shopId', '==', shopId),
      fb.where('status', '==', 'VALID'),
    );
    const readingsSnap = tx ? await tx.get(readingsQ) : await fb.getDocs(readingsQ);
    const readings = readingsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((r) => typeof r.consumptionKwh === 'number');
    const totalConsumedKwh = readings.reduce((s, r) => s + Number(r.consumptionKwh), 0);

    // Tarif actif
    let activePricePerKwh = shop.activePricePerKwh ?? null;
    if (activePricePerKwh == null) {
      const gallerySnap = tx
        ? await tx.get(fb.doc(fb.db, 'galleries', galleryId))
        : await fb.getDoc(fb.doc(fb.db, 'galleries', galleryId));
      const gallery = gallerySnap.data() ?? {};
      activePricePerKwh = shop.customPricePerKwh != null
        ? shop.customPricePerKwh
        : Number(gallery.defaultPricePerKwh ?? 0);
    }

    const remainingKwh = Number((totalPurchasedKwh - totalConsumedKwh).toFixed(3));
    const remainingAmount = Number((remainingKwh * Number(activePricePerKwh ?? 0)).toFixed(2));

    // Moyenne journalière
    const periodDays = shop.averagePeriodDays ?? DEFAULT_PERIOD_DAYS;
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
        ? fb.Timestamp.fromDate(
            new Date(Date.now() + estimatedDaysRemaining * 24 * 3600 * 1000),
          )
        : null;

    const lowThreshold = shop.lowCreditThresholdKwh ?? DEFAULT_LOW;
    const criticalThreshold = shop.criticalCreditThresholdKwh ?? DEFAULT_CRITICAL;

    let balanceStatus;
    if (remainingKwh <= 0) balanceStatus = 'EXHAUSTED';
    else if (remainingKwh <= criticalThreshold) balanceStatus = 'CRITICAL';
    else if (remainingKwh <= lowThreshold) balanceStatus = 'LOW';
    else balanceStatus = 'NORMAL';

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
      lastBalanceCalculatedAt: fb.serverTimestamp(),
      updatedAt: fb.serverTimestamp(),
    };

    if (tx) tx.update(shopRef, update);
    else await fb.updateDoc(shopRef, update);

    return { shopId, galleryId, shopName: shop.name, shopCode: shop.code, ...update };
  };

  let result;
  if (transaction) {
    result = await compute(transaction);
  } else {
    result = await fb.runTransaction(fb.db, compute);
  }

  // Alertes (hors transaction pour ne pas bloquer).
  try {
    await createBalanceAlertIfNeeded(result);
  } catch (err) {
    console.error('[recalculateShopBalance] alert creation failed', err);
  }
  return result;
}

async function createBalanceAlertIfNeeded(result) {
  const map = {
    LOW: { type: 'LOW_CREDIT', severity: 'WARNING', title: 'Crédit faible' },
    CRITICAL: { type: 'CRITICAL_CREDIT', severity: 'CRITICAL', title: 'Crédit critique' },
    EXHAUSTED: { type: 'EXHAUSTED_CREDIT', severity: 'CRITICAL', title: 'Crédit épuisé' },
  };
  const conf = map[result.balanceStatus];
  if (!conf) return;

  await createAlertIfNotExists({
    galleryId: result.galleryId,
    shopId: result.shopId,
    type: conf.type,
    severity: conf.severity,
    title: conf.title,
    message: `${result.shopName} (${result.shopCode}) — ${result.balanceStatus}. Reste ${result.remainingKwh} kWh.`,
    relatedEntityType: 'shop',
    relatedEntityId: result.shopId,
  });
}