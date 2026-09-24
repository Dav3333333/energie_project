const { onCall } = require('firebase-functions/v2/https');
const { z } = require('zod');
const { validate } = require('../utils/validate');
const { AppError, ERROR_CODES, toHttpsError } = require('../utils/errors');
const { requireAuth, requireGalleryAccess } = require('../middleware/requireAuth');
const { writeAuditLog } = require('../services/audit.service');
const { AUDIT_ACTIONS } = require('../constants/actions');
const { ROLES } = require('../constants/roles');
const svc = require('../services/gallery.service');

// -------------------------------------------------------------- createGallery
const CreateSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(30).regex(/^[A-Z0-9-]+$/, 'Code : majuscules, chiffres, tiret.'),
  address: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().nullable().optional(),
  currency: z.enum(['USD', 'CDF']),
  defaultPricePerKwh: z.number().nonnegative(),
  lowCreditThresholdKwh: z.number().nonnegative().optional(),
  criticalCreditThresholdKwh: z.number().nonnegative().optional(),
});

exports.createGallery = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (actor.role !== ROLES.SUPER_ADMIN) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Réservé au SUPER_ADMIN.');
    }
    const input = validate(req.data, CreateSchema);
    const gallery = await svc.createGallery({ input, actorUserId: actor.uid });
    await writeAuditLog({
      action: AUDIT_ACTIONS.GALLERY_CREATED,
      entityType: 'gallery',
      entityId: gallery.id,
      actorUserId: actor.uid,
      actorRole: actor.role,
      newData: { name: gallery.name, code: gallery.code, currency: gallery.currency },
    });
    return { ok: true, gallery: { id: gallery.id } };
  } catch (err) {
    throw toHttpsError(err);
  }
});

// -------------------------------------------------------------- updateGallery
const UpdateSchema = z.object({
  galleryId: z.string().min(1),
  patch: z.object({
    name: z.string().min(2).max(120).optional(),
    address: z.string().max(200).optional(),
    city: z.string().max(80).optional(),
    country: z.string().max(80).optional(),
    phone: z.string().max(30).nullable().optional(),
    email: z.string().email().nullable().optional(),
    currency: z.enum(['USD', 'CDF']).optional(),
    defaultPricePerKwh: z.number().nonnegative().optional(),
    lowCreditThresholdKwh: z.number().nonnegative().optional(),
    criticalCreditThresholdKwh: z.number().nonnegative().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  }).strict(),
});

exports.updateGallery = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (actor.role !== ROLES.SUPER_ADMIN && actor.role !== ROLES.GALLERY_ADMIN) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }
    const input = validate(req.data, UpdateSchema);
    requireGalleryAccess(actor, input.galleryId);

    const result = await svc.updateGallery({
      galleryId: input.galleryId,
      patch: input.patch,
      actorUserId: actor.uid,
    });
    await writeAuditLog({
      action: AUDIT_ACTIONS.GALLERY_UPDATED,
      entityType: 'gallery',
      entityId: input.galleryId,
      galleryId: input.galleryId,
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

// ------------------------------------------------------------- archiveGallery
const ArchiveSchema = z.object({
  galleryId: z.string().min(1),
  reason: z.string().max(500).nullable().optional(),
});

exports.archiveGallery = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (actor.role !== ROLES.SUPER_ADMIN) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Réservé au SUPER_ADMIN.');
    }
    const input = validate(req.data, ArchiveSchema);
    const result = await svc.archiveGallery({
      galleryId: input.galleryId,
      reason: input.reason ?? null,
      actorUserId: actor.uid,
    });
    await writeAuditLog({
      action: AUDIT_ACTIONS.GALLERY_ARCHIVED,
      entityType: 'gallery',
      entityId: input.galleryId,
      galleryId: input.galleryId,
      actorUserId: actor.uid,
      actorRole: actor.role,
      reason: input.reason ?? null,
    });
    return { ok: true };
  } catch (err) {
    throw toHttpsError(err);
  }
});