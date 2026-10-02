import { fb, AppError, ERR } from './base';
import { writeAuditLog, AUDIT_ACTIONS } from './audit';
import { recalculateShopBalance, recalculateMeterBalance } from './balances';

export async function createManualReading({ input, actorUserId, actorRole }) {
  const meterRef = fb.doc(fb.db, 'meters', input.meterId);
  const meterSnap = await fb.getDoc(meterRef);
  if (!meterSnap.exists()) throw new AppError(ERR.NOT_FOUND, 'Compteur introuvable.');
  const meter = meterSnap.data();

  if (meter.status !== 'ACTIVE') throw new AppError(ERR.FAILED_PRECONDITION, 'Compteur non actif.');
  if (meter.readingMode !== 'MANUAL') throw new AppError(ERR.FAILED_PRECONDITION, 'Lecture non manuelle.');

  const now = fb.serverTimestamp();
  const readingDate = input.readingDate
    ? fb.Timestamp.fromDate(new Date(input.readingDate))
    : fb.Timestamp.now();

  const readingRef = fb.doc(fb.collection(fb.db, 'readings'));
  let createdReading;

  await fb.runTransaction(fb.db, async (tx) => {
    const meterTxSnap = await tx.get(meterRef);
    if (!meterTxSnap.exists()) throw new AppError(ERR.NOT_FOUND, 'Compteur introuvable.');
    const meterTx = meterTxSnap.data();
    const previousTotalKwh = Number(meterTx.lastTotalKwh ?? meterTx.initialKwh ?? 0);

    if (input.totalKwh < previousTotalKwh) {
      throw new AppError(ERR.FAILED_PRECONDITION,
        `Index invalide : ${input.totalKwh} < dernier index (${previousTotalKwh}).`);
    }

    const consumptionKwh = Number((input.totalKwh - previousTotalKwh).toFixed(3));
    const readingData = {
      galleryId: meter.galleryId,
      shopId: meter.shopId ?? null,
      meterId: input.meterId,
      totalKwh: input.totalKwh,
      previousTotalKwh,
      consumptionKwh,
      readingDate,
      source: 'MANUAL',
      status: 'VALID',
      notes: input.notes ?? null,
      evidenceImageUrl: input.evidenceImageUrl ?? null,
      createdByUserId: actorUserId,
      validatedByUserId: actorUserId,
      invalidatedByUserId: null,
      invalidReason: null,
      correctionOfReadingId: null,
      createdAt: now,
      updatedAt: now,
    };

    tx.set(readingRef, readingData);
    tx.update(meterRef, {
      lastTotalKwh: input.totalKwh,
      lastValidReadingId: readingRef.id,
      lastReadingAt: readingDate,
      updatedAt: now,
    });
    if (meter.shopId) {
      tx.update(fb.doc(fb.db, 'shops', meter.shopId), {
        lastReadingAt: readingDate, updatedAt: now,
      });
    }
    createdReading = { id: readingRef.id, ...readingData };
  });

  let newBalance = null;
  try {
    newBalance = await recalculateMeterBalance(input.meterId);
    if (meter.shopId) newBalance = await recalculateShopBalance(meter.shopId);
  } catch (err) {
    console.error('[createManualReading] recalc failed', err);
  }

  await writeAuditLog({
    action: AUDIT_ACTIONS.READING_CREATED,
    entityType: 'reading', entityId: readingRef.id,
    galleryId: meter.galleryId, shopId: meter.shopId ?? null,
    actorUserId, actorRole,
    newData: { meterId: input.meterId, totalKwh: input.totalKwh, consumptionKwh: createdReading.consumptionKwh },
  });

  return {
    reading: {
      id: readingRef.id,
      totalKwh: createdReading.totalKwh,
      previousTotalKwh: createdReading.previousTotalKwh,
      consumptionKwh: createdReading.consumptionKwh,
      readingDate: createdReading.readingDate,
    },
    balance: newBalance
      ? { remainingKwh: newBalance.remainingKwh, balanceStatus: newBalance.balanceStatus, remainingAmount: newBalance.remainingAmount }
      : null,
  };
}
