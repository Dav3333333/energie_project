const { onCall } = require('firebase-functions/v2/https');
const { z } = require('zod');
const { validate } = require('../utils/validate');
const { AppError, ERROR_CODES, toHttpsError } = require('../utils/errors');
const { requireAuth, requireGalleryAccess, requireShopAccess } = require('../middleware/requireAuth');
const { writeAuditLog } = require('../services/audit.service');
const { createAlertIfNotExists, ALERT_TYPE, SEVERITY } = require('../services/alert.service');
const { AUDIT_ACTIONS } = require('../constants/actions');
const { ROLES } = require('../constants/roles');
const { db, admin } = require('../config/admin');

const Schema = z.object({
  galleryId: z.string().min(1),
  shopId: z.string().nullable().optional(),
  powerStatus: z.enum(['AVAILABLE', 'OUTAGE', 'UNSTABLE', 'UNKNOWN']),
  energySource: z.enum(['GRID', 'GENERATOR', 'SOLAR', 'BATTERY', 'UNKNOWN']).default('UNKNOWN'),
  description: z.string().max(500).nullable().optional(),
});

exports.createManualPowerEvent = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (![ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN, ROLES.TECHNICIAN].includes(actor.role)) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }
    const input = validate(req.data, Schema);
    requireGalleryAccess(actor, input.galleryId);
    if (input.shopId) requireShopAccess(actor, input.shopId);

    const now = admin.firestore.FieldValue.serverTimestamp();
    const eventRef = db
      .collection('galleries')
      .doc(input.galleryId)
      .collection('powerEvents')
      .doc();

    const eventData = {
      scope: input.shopId ? 'SHOP' : 'GALLERY',
      shopId: input.shopId ?? null,
      powerStatus: input.powerStatus,
      energySource: input.energySource,
      description: input.description ?? null,
      source: 'MANUAL',
      declaredByUserId: actor.uid,
      declaredAt: now,
      resolvedAt: input.powerStatus === 'AVAILABLE' ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.set(eventRef, eventData);

    if (input.shopId) {
      batch.update(db.collection('shops').doc(input.shopId), {
        currentPowerStatus: input.powerStatus,
        currentEnergySource: input.energySource,
        updatedAt: now,
      });
    } else {
      batch.update(db.collection('galleries').doc(input.galleryId), {
        mainPowerStatus: input.powerStatus,
        mainEnergySource: input.energySource,
        updatedAt: now,
      });
    }

    await batch.commit();

    // Alerte si OUTAGE ou UNSTABLE
    if (input.powerStatus === 'OUTAGE' || input.powerStatus === 'UNSTABLE') {
      await createAlertIfNotExists({
        galleryId: input.galleryId,
        shopId: input.shopId ?? null,
        type: input.powerStatus === 'OUTAGE' ? ALERT_TYPE.MANUAL_OUTAGE : ALERT_TYPE.MANUAL_UNSTABLE_POWER,
        severity: input.powerStatus === 'OUTAGE' ? SEVERITY.CRITICAL : SEVERITY.WARNING,
        title: input.powerStatus === 'OUTAGE' ? 'Coupure déclarée' : 'Courant instable déclaré',
        message: input.description || `Déclaration manuelle : ${input.powerStatus}.`,
        relatedEntityType: 'powerEvent',
        relatedEntityId: eventRef.id,
      });
    }

    await writeAuditLog({
      action: AUDIT_ACTIONS.POWER_EVENT_CREATED,
      entityType: 'powerEvent',
      entityId: eventRef.id,
      galleryId: input.galleryId,
      shopId: input.shopId ?? null,
      actorUserId: actor.uid,
      actorRole: actor.role,
      newData: {
        powerStatus: input.powerStatus,
        energySource: input.energySource,
      },
    });

    return { ok: true, eventId: eventRef.id };
  } catch (err) {
    throw toHttpsError(err);
  }
});