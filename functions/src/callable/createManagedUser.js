const { onCall } = require('firebase-functions/v2/https');
const { z } = require('zod');
const { validate } = require('../utils/validate');
const { AppError, ERROR_CODES, toHttpsError } = require('../utils/errors');
const { requireAuth, requireRole, requireGalleryAccess } = require('../middleware/requireAuth');
const { createManagedUser } = require('../services/user.service');
const { db } = require('../config/admin');
const { writeAuditLog } = require('../utils/audit');
const { AUDIT_ACTIONS } = require('../constants/actions');
const { ROLES } = require('../constants/roles');

const Schema = z.object({
  email: z.string().email('Email invalide.'),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum.'),
  username: z.string().min(3).max(30),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  phone: z.string().max(30).nullable().optional(),
  role: z.enum(Object.values(ROLES)),
  galleryIds: z.array(z.string()).default([]),
  shopIds: z.array(z.string()).default([]),
});

exports.createManagedUser = onCall({ region: 'us-central1' }, async (request) => {
  try {
    const actor = await requireAuth(request);
    const input = validate(request.data, Schema);

    // Autorisations
    if (actor.role === ROLES.SUPER_ADMIN) {
      // Peut créer tous les rôles.
    } else if (actor.role === ROLES.GALLERY_ADMIN) {
      if (input.role === ROLES.SUPER_ADMIN || input.role === ROLES.GALLERY_ADMIN) {
        throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
      }
      // Doit avoir accès à toutes les galeries ciblées.
      for (const gid of input.galleryIds) requireGalleryAccess(actor, gid);
      if (input.galleryIds.length === 0) {
        throw new AppError(ERROR_CODES.INVALID_ARGUMENT, 'Au moins une galerie est requise.');
      }
    } else {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }

    // SHOP_OWNER et SHOP_WORKER : au moins une boutique requise.
    const shopRole = [ROLES.SHOP_OWNER, ROLES.SHOP_WORKER].includes(input.role);
    if (shopRole && (input.shopIds.length === 0 || input.galleryIds.length === 0)) {
      throw new AppError(ERROR_CODES.INVALID_ARGUMENT, 'Une galerie et une boutique sont requises.');
    }
    if (shopRole) {
      const shopSnapshots = await Promise.all(
        input.shopIds.map((shopId) => db.collection('shops').doc(shopId).get()),
      );
      const allShopsBelongToGallery = shopSnapshots.every(
        (shop) => shop.exists && input.galleryIds.includes(shop.data().galleryId),
      );
      if (!allShopsBelongToGallery) {
        throw new AppError(ERROR_CODES.INVALID_ARGUMENT, 'Une boutique ne correspond pas à la galerie sélectionnée.');
      }
    }

    const created = await createManagedUser({
      ...input,
      phone: input.phone ?? null,
      createdByUserId: actor.uid,
      actorRole: actor.role,
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.USER_CREATED,
      entityType: 'user',
      entityId: created.uid,
      galleryId: input.galleryIds[0] ?? null,
      shopId: input.shopIds[0] ?? null,
      actorUserId: actor.uid,
      actorRole: actor.role,
      newData: {
        uid: created.uid,
        email: created.email,
        username: created.username,
        role: created.role,
        status: created.status,
        galleryIds: created.galleryIds,
        shopIds: created.shopIds,
      },
    });

    return { ok: true, user: created };
  } catch (err) {
    throw toHttpsError(err);
  }
});