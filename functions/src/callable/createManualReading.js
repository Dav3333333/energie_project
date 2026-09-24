const { onCall } = require('firebase-functions/v2/https');
const { z } = require('zod');
const { validate } = require('../utils/validate');
const { AppError, ERROR_CODES, toHttpsError } = require('../utils/errors');
const { requireAuth, requireGalleryAccess } = require('../middleware/requireAuth');
const { writeAuditLog } = require('../services/audit.service');
const { recalculateShopBalance } = require('../services/balance.service');
const { AUDIT_ACTIONS } = require('../constants/actions');
const { ROLES } = require('../constants/roles');
const { db, admin } = require('../config/admin');

const Schema = z.object({
  meterId: z.string().min(1),
  totalKwh: z.number().nonnegative().finite(),
  readingDate: z.union([z.string(), z.number(), z.date()]).optional(),
  notes: z.string().max(500).nullable().optional(),
  evidenceImageUrl: z.string().url().nullable().optional(),
});

exports.createManualReading = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (![ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN, ROLES.TECHNICIAN].includes(actor.role)) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé à créer un relevé.');
    }
    const input = validate(req.data, Schema);

    const meterRef = db.collection('meters').doc(input.meterId);
    const meterSnap = await meterRef.get();
    if (!meterSnap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Compteur introuvable.');
    const meter = meterSnap.data();

    if (meter.status !== 'ACTIVE') {
      throw new AppError(ERROR_CODES.FAILED_PRECONDITION, 'Compteur non actif.');
    }
    if (meter.readingMode !== 'MANUAL') {
      throw new AppError(ERROR_CODES.FAILED_PRECONDITION, 'Ce compteur ne se lit pas manuellement.');
    }
    requireGalleryAccess(actor, meter.galleryId);

    // Identifiant d'idempotence simple : même compteur + même index + même seconde.
    const now = admin.firestore.FieldValue.serverTimestamp();
    const readingDate = input.readingDate
      ? admin.firestore.Timestamp.fromDate(new Date(input.readingDate))
      : admin.firestore.Timestamp.now();

    // Transaction : lecture dernier VALID + écriture + maj meter + recalcul balance.
    const readingRef = db.collection('readings').doc();
    let createdReading;
    let newBalance = null;

    await db.runTransaction(async (tx) => {
      // Relecture du compteur (cohérence).
      const meterTxSnap = await tx.get(meterRef);
      const meterTx = meterTxSnap.data();

      // Dernier relevé VALID.
      const q = db
        .collection('readings')
        .where('meterId', '==', input.meterId)
        .where('status', '==', 'VALID')
        .orderBy('readingDate', 'desc')
        .limit(1);
      const lastSnap = await tx.get(q);
      const last = lastSnap.empty ? null : lastSnap.docs[0].data();
      const previousTotalKwh = last?.totalKwh ?? Number(meterTx.initialKwh ?? 0);

      if (input.totalKwh < previousTotalKwh) {
        throw new AppError(
          ERROR_CODES.FAILED_PRECONDITION,
          `Index invalide : ${input.totalKwh} < dernier index valide (${previousTotalKwh}).`,
        );
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
        createdByUserId: actor.uid,
        validatedByUserId: actor.uid, // auto-validation en MVP
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

      // Met à jour la boutique (lastReadingAt).
      if (meter.shopId) {
        tx.update(db.collection('shops').doc(meter.shopId), {
          lastReadingAt: readingDate,
          updatedAt: now,
        });
      }

      createdReading = { id: readingRef.id, ...readingData };
    });

    // Recalcul du solde (hors transaction pour lisibilité ; idempotent).
    if (meter.shopId) {
      try {
        newBalance = await recalculateShopBalance(meter.shopId);
      } catch (err) {
        console.error('[createManualReading] recalc balance failed:', err);
      }
    }

    await writeAuditLog({
      action: AUDIT_ACTIONS.READING_CREATED,
      entityType: 'reading',
      entityId: readingRef.id,
      galleryId: meter.galleryId,
      shopId: meter.shopId ?? null,
      actorUserId: actor.uid,
      actorRole: actor.role,
      newData: {
        meterId: input.meterId,
        totalKwh: input.totalKwh,
        consumptionKwh: createdReading.consumptionKwh,
      },
    });

    return {
      ok: true,
      reading: {
        id: readingRef.id,
        totalKwh: createdReading.totalKwh,
        previousTotalKwh: createdReading.previousTotalKwh,
        consumptionKwh: createdReading.consumptionKwh,
        readingDate: createdReading.readingDate,
      },
      balance: newBalance
        ? {
            remainingKwh: newBalance.remainingKwh,
            balanceStatus: newBalance.balanceStatus,
            remainingAmount: newBalance.remainingAmount,
          }
        : null,
    };
  } catch (err) {
    throw toHttpsError(err);
  }
});