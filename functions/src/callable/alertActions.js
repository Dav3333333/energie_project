const { onCall } = require('firebase-functions/v2/https');
const { z } = require('zod');
const { validate } = require('../utils/validate');
const { AppError, ERROR_CODES, toHttpsError } = require('../utils/errors');
const { requireAuth, requireGalleryAccess } = require('../middleware/requireAuth');
const { writeAuditLog } = require('../services/audit.service');
const { db, admin } = require('../config/admin');
const { ROLES } = require('../constants/roles');

// Acknowledge ---------------------------------------------------------------
const AckSchema = z.object({ alertId: z.string().min(1) });

exports.acknowledgeAlert = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (![ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN, ROLES.TECHNICIAN].includes(actor.role)) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }
    const input = validate(req.data, AckSchema);
    const ref = db.collection('alerts').doc(input.alertId);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Alerte introuvable.');
    requireGalleryAccess(actor, snap.data().galleryId);

    await ref.update({
      status: 'ACKNOWLEDGED',
      acknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
      acknowledgedByUserId: actor.uid,
    });

    await writeAuditLog({
      action: 'ALERT_ACKNOWLEDGED',
      entityType: 'alert',
      entityId: input.alertId,
      galleryId: snap.data().galleryId,
      shopId: snap.data().shopId,
      actorUserId: actor.uid,
      actorRole: actor.role,
    });
    return { ok: true };
  } catch (err) {
    throw toHttpsError(err);
  }
});

// Resolve -------------------------------------------------------------------
const ResolveSchema = z.object({ alertId: z.string().min(1) });

exports.resolveAlert = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (![ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN, ROLES.TECHNICIAN].includes(actor.role)) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }
    const input = validate(req.data, ResolveSchema);
    const ref = db.collection('alerts').doc(input.alertId);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Alerte introuvable.');
    requireGalleryAccess(actor, snap.data().galleryId);

    await ref.update({
      status: 'RESOLVED',
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      resolvedByUserId: actor.uid,
    });

    await writeAuditLog({
      action: 'ALERT_RESOLVED',
      entityType: 'alert',
      entityId: input.alertId,
      galleryId: snap.data().galleryId,
      shopId: snap.data().shopId,
      actorUserId: actor.uid,
      actorRole: actor.role,
    });
    return { ok: true };
  } catch (err) {
    throw toHttpsError(err);
  }
});