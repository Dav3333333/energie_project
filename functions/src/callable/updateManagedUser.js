const { onCall } = require('firebase-functions/v2/https');
const { z } = require('zod');
const { validate } = require('../utils/validate');
const { AppError, ERROR_CODES, toHttpsError } = require('../utils/errors');
const { requireAuth, requireGalleryAccess } = require('../middleware/requireAuth');
const { updateManagedUser } = require('../services/user.service');
const { writeAuditLog } = require('../utils/audit');
const { AUDIT_ACTIONS } = require('../constants/actions');
const { ROLES, USER_STATUS } = require('../constants/roles');

const Schema = z.object({
  targetUid: z.string().min(1),
  patch: z
    .object({
      firstName: z.string().min(1).max(60).optional(),
      lastName: z.string().min(1).max(60).optional(),
      phone: z.string().max(30).nullable().optional(),
      role: z.enum(Object.values(ROLES)).optional(),
      status: z.enum(Object.values(USER_STATUS)).optional(),
      galleryIds: z.array(z.string()).optional(),
      shopIds: z.array(z.string()).optional(),
    })
    .strict(),
});

exports.updateManagedUser = onCall({ region: 'us-central1' }, async (request) => {
  try {
    const actor = await requireAuth(request);
    const input = validate(request.data, Schema);

    const isPrivileged = actor.role === ROLES.SUPER_ADMIN;
    if (!isPrivileged && actor.role !== ROLES.GALLERY_ADMIN) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }

    // Empêcher un GALLERY_ADMIN de toucher rôle/statut/relations.
    if (!isPrivileged) {
      const forbidden = ['role', 'status', 'galleryIds', 'shopIds'].filter(
        (k) => input.patch[k] !== undefined,
      );
      if (forbidden.length > 0) {
        throw new AppError(
          ERROR_CODES.PERMISSION_DENIED,
          'Modification réservée au SUPER_ADMIN.',
          { forbidden },
        );
      }
    }

    // Si GALLERY_ADMIN : vérifier que la cible partage au moins une galerie.
    if (!isPrivileged) {
      const targetSnap = await require('../config/admin').db
        .collection('users').doc(input.targetUid).get();
      const target = targetSnap.data();
      const shared = (target?.galleryIds ?? []).some((g) => actor.galleryIds.includes(g));
      if (!shared) {
        throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Utilisateur hors périmètre.');
      }
    }

    // Si changement de galeries : le SUPER_ADMIN doit y avoir accès (toujours vrai).
    if (input.patch.galleryIds) {
      for (const gid of input.patch.galleryIds) requireGalleryAccess(actor, gid);
    }

    const result = await updateManagedUser({
      targetUid: input.targetUid,
      patch: input.patch,
      actorUserId: actor.uid,
      actorRole: actor.role,
      allowPrivilegedChange: isPrivileged,
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityType: 'user',
      entityId: input.targetUid,
      galleryId: input.patch.galleryIds?.[0] ?? result.previous.galleryIds?.[0] ?? null,
      actorUserId: actor.uid,
      actorRole: actor.role,
      previousData: {
        firstName: result.previous.firstName,
        lastName: result.previous.lastName,
        phone: result.previous.phone,
        role: result.previous.role,
        status: result.previous.status,
        galleryIds: result.previous.galleryIds,
        shopIds: result.previous.shopIds,
      },
      newData: input.patch,
    });

    return { ok: true, uid: input.targetUid };
  } catch (err) {
    throw toHttpsError(err);
  }
});