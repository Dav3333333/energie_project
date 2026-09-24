const { onCall } = require('firebase-functions/v2/https');
const { z } = require('zod');
const { validate } = require('../utils/validate');
const { AppError, ERROR_CODES, toHttpsError } = require('../utils/errors');
const { requireAuth, requireShopAccess } = require('../middleware/requireAuth');
const { writeAuditLog } = require('../services/audit.service');
const { createPurchase } = require('../services/purchase.service');
const { maybeCreateBalanceAlert } = require('../services/alert.service');
const { AUDIT_ACTIONS } = require('../constants/actions');
const { ROLES } = require('../constants/roles');

const Schema = z.object({
  shopId: z.string().min(1),
  purchasedKwh: z.number().positive().finite(),
  pricePerKwh: z.number().nonnegative().finite().optional(),
  currency: z.enum(['USD', 'CDF']).optional(),
  paymentMethod: z.enum(['CASH', 'MOBILE_MONEY', 'BANK', 'OTHER']).default('CASH'),
  paymentReference: z.string().max(120).nullable().optional(),
  receiptFileUrl: z.string().url().nullable().optional(),
  purchaseDate: z.union([z.string(), z.number(), z.date()]).optional(),
});

exports.createEnergyPurchase = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (![ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(actor.role)) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }
    const input = validate(req.data, Schema);
    requireShopAccess(actor, input.shopId);

    const result = await createPurchase({ input, actorUserId: actor.uid });

    if (result.balance) {
      await maybeCreateBalanceAlert(input.shopId, result.balance);
    }

    await writeAuditLog({
      action: AUDIT_ACTIONS.PURCHASE_CREATED,
      entityType: 'energyPurchase',
      entityId: result.id,
      galleryId: result.galleryId,
      shopId: input.shopId,
      actorUserId: actor.uid,
      actorRole: actor.role,
      newData: {
        receiptNumber: result.receiptNumber,
        purchasedKwh: result.purchasedKwh,
        pricePerKwh: result.pricePerKwh,
        totalAmount: result.totalAmount,
        currency: result.currency,
      },
    });

    return {
      ok: true,
      purchase: {
        id: result.id,
        receiptNumber: result.receiptNumber,
        purchasedKwh: result.purchasedKwh,
        totalAmount: result.totalAmount,
        currency: result.currency,
      },
      balance: result.balance
        ? {
            remainingKwh: result.balance.remainingKwh,
            remainingAmount: result.balance.remainingAmount,
            balanceStatus: result.balance.balanceStatus,
          }
        : null,
    };
  } catch (err) {
    throw toHttpsError(err);
  }
});