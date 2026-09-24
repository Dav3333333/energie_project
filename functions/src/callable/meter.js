const { onCall } = require('firebase-functions/v2/https');
const { z } = require('zod');
const { validate } = require('../utils/validate');
const { AppError, ERROR_CODES, toHttpsError } = require('../utils/errors');
const { requireAuth, requireShopAccess, requireGalleryAccess } = require('../middleware/requireAuth');
const { writeAuditLog } = require('../services/audit.service');
const { AUDIT_ACTIONS } = require('../constants/actions');
const { ROLES } = require('../constants/roles');
const svc = require('../services/meter.service');

const CreateSchema = z.object({
  shopId: z.string().min(1),
  type: z.enum(['MAIN', 'SUB_METER']),
  code: z.string().min(1).max(30),
  name: z.string().min(2).max(120),
  serialNumber: z.string().max(80).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  parentMeterId: z.string().nullable().optional(),
  initialKwh: z.number().nonnegative().default(0),
});

exports.createMeter = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (![ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN, ROLES.TECHNICIAN].includes(actor.role)) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }
    const input = validate(req.data, CreateSchema);
    requireShopAccess(actor, input.shopId);

    const meter = await svc.createMeter({ input, actorUserId: actor.uid });
    await writeAuditLog({
      action: AUDIT_ACTIONS.METER_CREATED,
      entityType: 'meter',
      entityId: meter.id,
      galleryId: meter.galleryId,
      shopId: meter.shopId,
      actorUserId: actor.uid,
      actorRole: actor.role,
      newData: { code: meter.code, type: meter.type },
    });
    return { ok: true, meter: { id: meter.id } };
  } catch (err) {
    throw toHttpsError(err);
  }
});

const UpdateSchema = z.object({
  meterId: z.string().min(1),
  patch: z.object({
    name: z.string().min(2).max(120).optional(),
    serialNumber: z.string().max(80).nullable().optional(),
    description: z.string().max(500).nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ARCHIVED']).optional(),
  }).strict(),
});

exports.updateMeter = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (![ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN, ROLES.TECHNICIAN].includes(actor.role)) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }
    const input = validate(req.data, UpdateSchema);

    const { db } = require('../config/admin');
    const snap = await db.collection('meters').doc(input.meterId).get();
    if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Compteur introuvable.');
    requireGalleryAccess(actor, snap.data().galleryId);

    const result = await svc.updateMeter({
      meterId: input.meterId,
      patch: input.patch,
      actorUserId: actor.uid,
    });
    await writeAuditLog({
      action: AUDIT_ACTIONS.METER_UPDATED,
      entityType: 'meter',
      entityId: input.meterId,
      galleryId: result.previous.galleryId,
      shopId: result.previous.shopId,
      actorUserId: actor.uid,
      actorRole: actor.role,
      previousData: result.previous,
      newData: input.patch,
    });
    return { ok: true };
  } catch (err) {
    throw toHttpsError(err);
  }
});

const ArchiveSchema = z.object({
  meterId: z.string().min(1),
  reason: z.string().max(500).nullable().optional(),
});

exports.archiveMeter = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (![ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(actor.role)) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }
    const input = validate(req.data, ArchiveSchema);

    const { db } = require('../config/admin');
    const snap = await db.collection('meters').doc(input.meterId).get();
    if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Compteur introuvable.');
    requireGalleryAccess(actor, snap.data().galleryId);

    const result = await svc.archiveMeter({
      meterId: input.meterId,
      reason: input.reason ?? null,
      actorUserId: actor.uid,
    });
    await writeAuditLog({
      action: AUDIT_ACTIONS.METER_ARCHIVED,
      entityType: 'meter',
      entityId: input.meterId,
      galleryId: result.previous.galleryId,
      shopId: result.previous.shopId,
      actorUserId: actor.uid,
      actorRole: actor.role,
      reason: input.reason ?? null,
    });
    return { ok: true };
  } catch (err) {
    throw toHttpsError(err);
  }
});