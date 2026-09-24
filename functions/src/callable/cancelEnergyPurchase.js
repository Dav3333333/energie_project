const { onCall } = require('firebase-functions/v2/https');
const { z } = require('zod');
const { validate } = require('../utils/validate');
const { AppError, ERROR_CODES, toHttpsError } = require('../utils/errors');
const { requireAuth, requireShopAccess } = require('../middleware/requireAuth');
const { writeAuditLog } = require('../services/audit.service');
const { cancelPurchase } = require('../services/purchase.service');
const { AUDIT_ACTIONS } = require('../constants/actions');
const { ROLES } = require('../constants/roles');

const Schema = z.object({
  purchaseId: z.string().min(1),
  reason: z.string().min(3).max(500),
});

exports.cancelEnergyPurchase = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (![ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(actor.role)) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }
    const input = validate(req.data, Schema);

    // Vérifier que l'acteur a accès à la boutique de l'achat.
    const { db } = require('../config/admin');
    const snap = await db.collection('energyPurchases').doc(input.purchaseId).get();
    if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Achat introuvable.');
    requireShopAccess(actor, snap.data().shopId);

    const result = await cancelPurchase({
      purchaseId: input.purchaseId,
      reason: input.reason,
      actorUserId: actor.uid,
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.PURCHASE_CANCELLED,
      entityType: 'energyPurchase',
      entityId: input.purchaseId,
      galleryId: result.previous.galleryId,
      shopId: result.previous.shopId,
      actorUserId: actor.uid,
      actorRole: actor.role,
      previousData: { status: 'VALID' },
      newData: { status: 'CANCELLED' },
      reason: input.reason,
    });

    return { ok: true, balance: result.balance };
  } catch (err) {
    throw toHttpsError(err);
  }
});