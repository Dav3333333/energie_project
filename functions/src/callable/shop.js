const { onCall } = require('firebase-functions/v2/https');
const { z } = require('zod');
const { validate } = require('../utils/validate');
const { AppError, ERROR_CODES, toHttpsError } = require('../utils/errors');
const { requireAuth, requireGalleryAccess, requireShopAccess } = require('../middleware/requireAuth');
const { writeAuditLog } = require('../services/audit.service');
const { AUDIT_ACTIONS } = require('../constants/actions');
const { ROLES } = require('../constants/roles');
const svc = require('../services/shop.service');

const CreateSchema = z.object({
  galleryId: z.string().min(1),
  name: z.string().min(2).max(120),
  code: z.string().min(1).max(30),
  description: z.string().max(500).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  ownerIds: z.array(z.string()).default([]),
  workerIds: z.array(z.string()).default([]),
  customPricePerKwh: z.number().nonnegative().nullable().optional(),
  lowCreditThresholdKwh: z.number().nonnegative().nullable().optional(),
  criticalCreditThresholdKwh: z.number().nonnegative().nullable().optional(),
});

exports.createShop = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (actor.role !== ROLES.SUPER_ADMIN && actor.role !== ROLES.GALLERY_ADMIN) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }
    const input = validate(req.data, CreateSchema);
    requireGalleryAccess(actor, input.galleryId);

    const shop = await svc.createShop({ input, actorUserId: actor.uid });

    await writeAuditLog({
      action: AUDIT_ACTIONS.SHOP_CREATED,
      entityType: 'shop',
      entityId: shop.id,
      galleryId: shop.galleryId,
      shopId: shop.id,
      actorUserId: actor.uid,
      actorRole: actor.role,
      newData: { name: shop.name, code: shop.code },
    });
    return { ok: true, shop: { id: shop.id } };
  } catch (err) {
    throw toHttpsError(err);
  }
});

const UpdateSchema = z.object({
  shopId: z.string().min(1),
  patch: z.object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    location: z.string().max(120).nullable().optional(),
    ownerIds: z.array(z.string()).optional(),
    workerIds: z.array(z.string()).optional(),
    customPricePerKwh: z.number().nonnegative().nullable().optional(),
    lowCreditThresholdKwh: z.number().nonnegative().nullable().optional(),
    criticalCreditThresholdKwh: z.number().nonnegative().nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  }).strict(),
});

exports.updateShop = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (actor.role !== ROLES.SUPER_ADMIN && actor.role !== ROLES.GALLERY_ADMIN) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }
    const input = validate(req.data, UpdateSchema);
    requireShopAccess(actor, input.shopId);

    const result = await svc.updateShop({
      shopId: input.shopId,
      patch: input.patch,
      actorUserId: actor.uid,
    });
    await writeAuditLog({
      action: AUDIT_ACTIONS.SHOP_UPDATED,
      entityType: 'shop',
      entityId: input.shopId,
      galleryId: result.previous.galleryId,
      shopId: input.shopId,
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
  shopId: z.string().min(1),
  reason: z.string().max(500).nullable().optional(),
});

exports.archiveShop = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (actor.role !== ROLES.SUPER_ADMIN && actor.role !== ROLES.GALLERY_ADMIN) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }
    const input = validate(req.data, ArchiveSchema);
    requireShopAccess(actor, input.shopId);

    const result = await svc.archiveShop({
      shopId: input.shopId,
      reason: input.reason ?? null,
      actorUserId: actor.uid,
    });
    await writeAuditLog({
      action: AUDIT_ACTIONS.SHOP_ARCHIVED,
      entityType: 'shop',
      entityId: input.shopId,
      galleryId: result.previous.galleryId,
      shopId: input.shopId,
      actorUserId: actor.uid,
      actorRole: actor.role,
      reason: input.reason ?? null,
    });
    return { ok: true };
  } catch (err) {
    throw toHttpsError(err);
  }
});