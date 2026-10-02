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
export async function recalculateShopBalance(shopId) {
  const shopRef = fb.doc(fb.db, 'shops', shopId);

  const compute = async () => {
    const shopSnap = await fb.getDoc(shopRef);
    if (!shopSnap.exists()) throw new AppError(ERR.NOT_FOUND, 'Boutique introuvable.');
    const shop = shopSnap.data();
    const galleryId = shop.galleryId;

    // Achats VALID
    const purchasesQ = fb.query(
      fb.collection(fb.db, 'energyPurchases'),
      fb.where('shopId', '==', shopId),
    );
    const purchasesSnap = await fb.getDocs(purchasesQ);
    const purchases = purchasesSnap.docs.map((d) => d.data()).filter((purchase) => purchase.status === 'VALID');
    const totalPurchasedKwh = purchases.reduce((s, p) => s + Number(p.purchasedKwh ?? 0), 0);
    const totalPurchaseAmount = purchases.reduce((s, p) => s + Number(p.totalAmount ?? 0), 0);

    // Relevés VALID
    const readingsQ = fb.query(
      fb.collection(fb.db, 'readings'),
      fb.where('shopId', '==', shopId),
    );
    const readingsSnap = await fb.getDocs(readingsQ);
    const readings = readingsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((r) => r.status === 'VALID' && typeof r.consumptionKwh === 'number');
    const totalConsumedKwh = readings.reduce((s, r) => s + Number(r.consumptionKwh), 0);

    // Tarif actif
    let activePricePerKwh = totalPurchasedKwh > 0
      ? totalPurchaseAmount / totalPurchasedKwh
      : (shop.customPricePerKwh ?? shop.activePricePerKwh ?? null);
    if (activePricePerKwh == null) {
      const gallerySnap = await fb.getDoc(fb.doc(fb.db, 'galleries', galleryId));
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

    await fb.updateDoc(shopRef, update);

    return { shopId, galleryId, shopName: shop.name, shopCode: shop.code, ...update };
  };

  const result = await compute();

  // Alertes (hors transaction pour ne pas bloquer).
  try {
    await createBalanceAlertIfNeeded(result);
  } catch (err) {
    console.error('[recalculateShopBalance] alert creation failed', err);
  }
  return result;
}

/** Recalcule le crédit énergétique attribué directement à un compteur. */
export async function recalculateMeterBalance(meterId) {
  const meterRef = fb.doc(fb.db, 'meters', meterId);
  const meterSnap = await fb.getDoc(meterRef);
  if (!meterSnap.exists()) throw new AppError(ERR.NOT_FOUND, 'Compteur introuvable.');
  const meter = meterSnap.data();

  const purchasesQuery = fb.query(
    fb.collection(fb.db, 'energyPurchases'),
    fb.where('meterId', '==', meterId),
  );
  const readingsQuery = fb.query(
    fb.collection(fb.db, 'readings'),
    fb.where('meterId', '==', meterId),
  );
  const [purchaseSnapshot, readingSnapshot] = await Promise.all([
    fb.getDocs(purchasesQuery),
    fb.getDocs(readingsQuery),
  ]);
  const purchases = purchaseSnapshot.docs.map((doc) => doc.data()).filter((purchase) => purchase.status === 'VALID');
  const readings = readingSnapshot.docs.map((doc) => doc.data()).filter((reading) => reading.status === 'VALID');
  const totalPurchasedKwh = purchases.reduce((sum, purchase) => sum + Number(purchase.purchasedKwh ?? 0), 0);
  const totalPurchaseAmount = purchases.reduce((sum, purchase) => sum + Number(purchase.totalAmount ?? 0), 0);
  const currencies = [...new Set(purchases.map((purchase) => purchase.currency).filter(Boolean))];
  const currency = currencies.length === 1 ? currencies[0] : null;
  const totalConsumedKwh = readings.reduce((sum, reading) => sum + Number(reading.consumptionKwh ?? 0), 0);
  const activePricePerKwh = totalPurchasedKwh > 0
    ? totalPurchaseAmount / totalPurchasedKwh
    : Number(meter.activePricePerKwh ?? 0);
  const remainingKwh = Number((totalPurchasedKwh - totalConsumedKwh).toFixed(3));
  const balanceStatus = remainingKwh <= 0 ? 'EXHAUSTED' : remainingKwh <= DEFAULT_CRITICAL ? 'CRITICAL' : remainingKwh <= DEFAULT_LOW ? 'LOW' : 'NORMAL';
  const update = {
    totalPurchasedKwh: Number(totalPurchasedKwh.toFixed(3)),
    totalPurchaseAmount: Number(totalPurchaseAmount.toFixed(2)),
    totalConsumedKwh: Number(totalConsumedKwh.toFixed(3)),
    remainingKwh,
    remainingAmount: currency ? Number((remainingKwh * activePricePerKwh).toFixed(2)) : null,
    currency,
    activePricePerKwh: Number(activePricePerKwh.toFixed(4)),
    balanceStatus,
    lastBalanceCalculatedAt: fb.serverTimestamp(),
    updatedAt: fb.serverTimestamp(),
  };
  await fb.updateDoc(meterRef, update);
  return { meterId, galleryId: meter.galleryId, shopId: meter.shopId ?? null, ...update };
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
