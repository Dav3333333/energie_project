const { onCall } = require('firebase-functions/v2/https');
const { z } = require('zod');
const { validate } = require('../utils/validate');
const { AppError, ERROR_CODES, toHttpsError } = require('../utils/errors');
const { requireAuth } = require('../middleware/requireAuth');
const { archiveManagedUser } = require('../services/user.service');
const { writeAuditLog } = require('../utils/audit');
const { AUDIT_ACTIONS } = require('../constants/actions');
const { ROLES } = require('../constants/roles');

const Schema = z.object({
  targetUid: z.string().min(1),
  reason: z.string().max(500).nullable().optional(),
});

exports.archiveManagedUser = onCall({ region: 'us-central1' }, async (request) => {
  try {
    const actor = await requireAuth(request);
    if (actor.role !== ROLES.SUPER_ADMIN && actor.role !== ROLES.GALLERY_ADMIN) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }

    const input = validate(request.data, Schema);
    if (input.targetUid === actor.uid) {
      throw new AppError(ERROR_CODES.FAILED_PRECONDITION, 'Auto-archivage interdit.');
    }

    // GALLERY_ADMIN : périmètre restreint.
    if (actor.role === ROLES.GALLERY_ADMIN) {
      const { db } = require('../config/admin');
      const targetSnap = await db.collection('users').doc(input.targetUid).get();
      const target = targetSnap.data();
      const shared = (target?.galleryIds ?? []).some((g) => actor.galleryIds.includes(g));
      if (!shared || [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(target?.role)) {
        throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Utilisateur hors périmètre.');
      }
    }

    const result = await archiveManagedUser({
      targetUid: input.targetUid,
      reason: input.reason ?? null,
      actorUserId: actor.uid,
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.USER_ARCHIVED,
      entityType: 'user',
      entityId: input.targetUid,
      galleryId: result.previous.galleryIds?.[0] ?? null,
      actorUserId: actor.uid,
      actorRole: actor.role,
      previousData: { status: result.previous.status },
      newData: { status: 'ARCHIVED' },
      reason: input.reason ?? null,
    });

    return { ok: true, uid: input.targetUid };
  } catch (err) {
    throw toHttpsError(err);
  }
});