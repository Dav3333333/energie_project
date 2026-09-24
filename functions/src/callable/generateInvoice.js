const { onCall } = require('firebase-functions/v2/https');
const { z } = require('zod');
const { validate } = require('../utils/validate');
const { AppError, ERROR_CODES, toHttpsError } = require('../utils/errors');
const {
  requireAuth, requireShopAccess, requireGalleryAccess,
} = require('../middleware/requireAuth');
const { writeAuditLog } = require('../services/audit.service');
const {
  generateInvoiceNumber, computeInvoiceTotals,
} = require('../services/invoice.service');
const { buildInvoicePdf, uploadInvoicePdf } = require('../services/pdf.service');
const { AUDIT_ACTIONS } = require('../constants/actions');
const { ROLES } = require('../constants/roles');
const { db, admin } = require('../config/admin');

const Schema = z.object({
  shopId: z.string().min(1),
  type: z.enum(['INVOICE', 'STATEMENT']).default('STATEMENT'),
  periodStart: z.union([z.string(), z.number(), z.date()]),
  periodEnd: z.union([z.string(), z.number(), z.date()]),
});

exports.generateInvoice = onCall(
  { region: 'us-central1', memory: '512MiB', timeoutSeconds: 60 },
  async (req) => {
    try {
      const actor = await requireAuth(req);
      if (![ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(actor.role)) {
        throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
      }
      const input = validate(req.data, Schema);
      requireShopAccess(actor, input.shopId);

      const periodStart = admin.firestore.Timestamp.fromDate(new Date(input.periodStart));
      const periodEnd = admin.firestore.Timestamp.fromDate(new Date(input.periodEnd));
      if (periodStart.toMillis() >= periodEnd.toMillis()) {
        throw new AppError(ERROR_CODES.INVALID_ARGUMENT, 'Période invalide.');
      }

      const totals = await computeInvoiceTotals({
        shopId: input.shopId,
        periodStart,
        periodEnd,
      });
      requireGalleryAccess(actor, totals.shop.galleryId);

      // ----- Numéro de facture (transaction) -----
      const invoiceRef = db.collection('invoices').doc();
      let invoiceNumber;
      await db.runTransaction(async (tx) => {
        invoiceNumber = await generateInvoiceNumber({
          galleryCode: totals.gallery.code,
          transaction: tx,
          date: periodEnd.toDate(),
        });
      });

      const now = admin.firestore.FieldValue.serverTimestamp();

      // ----- PDF -----
      const actorSnap = await db.collection('users').doc(actor.uid).get();
      const actorData = actorSnap.exists ? actorSnap.data() : {};

      const pdfBuffer = await buildInvoicePdf({
        gallery: totals.gallery,
        shop: totals.shop,
        invoice: {
          invoiceNumber,
          type: input.type,
          periodStart,
          periodEnd,
          createdAt: now,
          openingMeterKwh: totals.openingMeterKwh,
          closingMeterKwh: totals.closingMeterKwh,
          consumedKwh: totals.consumedKwh,
          purchasedKwh: totals.purchasedKwh,
          remainingKwh: totals.remainingKwh,
          pricePerKwh: totals.pricePerKwh,
          consumedAmount: totals.consumedAmount,
          remainingAmount: totals.remainingAmount,
          currency: totals.currency,
        },
        generatedBy: { fullName: actorData.fullName, email: actorData.email },
      });

      const { path, url } = await uploadInvoicePdf({
        galleryId: totals.shop.galleryId,
        invoiceId: invoiceRef.id,
        buffer: pdfBuffer,
      });

      const data = {
        galleryId: totals.shop.galleryId,
        shopId: input.shopId,
        invoiceNumber,
        type: input.type,
        periodStart,
        periodEnd,
        openingMeterKwh: totals.openingMeterKwh,
        closingMeterKwh: totals.closingMeterKwh,
        consumedKwh: totals.consumedKwh,
        purchasedKwh: totals.purchasedKwh,
        remainingKwh: totals.remainingKwh,
        pricePerKwh: totals.pricePerKwh,
        consumedAmount: totals.consumedAmount,
        remainingAmount: totals.remainingAmount,
        currency: totals.currency,
        status: 'ISSUED',
        pdfUrl: url,
        pdfPath: path,
        generatedByUserId: actor.uid,
        createdAt: now,
        updatedAt: now,
      };

      await invoiceRef.set(data);

      await writeAuditLog({
        action: AUDIT_ACTIONS.INVOICE_GENERATED,
        entityType: 'invoice',
        entityId: invoiceRef.id,
        galleryId: data.galleryId,
        shopId: data.shopId,
        actorUserId: actor.uid,
        actorRole: actor.role,
        newData: {
          invoiceNumber,
          type: input.type,
          consumedKwh: data.consumedKwh,
          consumedAmount: data.consumedAmount,
        },
      });

      return {
        ok: true,
        invoice: {
          id: invoiceRef.id,
          invoiceNumber,
          pdfUrl: url,
        },
      };
    } catch (err) {
      throw toHttpsError(err);
    }
  },
);