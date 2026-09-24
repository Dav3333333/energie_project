import { z } from 'zod';

export const purchaseCreateSchema = z.object({
  shopId: z.string().min(1),
  purchasedKwh: z.coerce
    .number()
    .positive('La quantité doit être supérieure à 0.')
    .finite(),
  pricePerKwh: z.coerce.number().nonnegative().optional(),
  currency: z.enum(['USD', 'CDF']).optional(),
  paymentMethod: z.enum(['CASH', 'MOBILE_MONEY', 'BANK', 'OTHER']).default('CASH'),
  paymentReference: z.string().max(120).optional().or(z.literal('')),
  purchaseDate: z.string().optional(),
  receiptFileUrl: z.string().url().optional().or(z.literal('')),
});

export const purchaseCancelSchema = z.object({
  reason: z.string().min(3, 'Motif requis.').max(500),
});