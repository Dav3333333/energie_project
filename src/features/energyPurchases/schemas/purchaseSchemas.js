import { z } from 'zod';

export const purchaseCreateSchema = z.object({
  meterId: z.string().min(1, 'Sélectionnez le compteur destinataire.'),
  purchasedKwh: z.coerce
    .number()
    .positive('La quantité doit être supérieure à 0.')
    .finite(),
  totalAmount: z.coerce.number().positive('Le montant total doit être supérieur à 0.').finite(),
  currency: z.enum(['USD', 'CDF']).optional(),
  paymentMethod: z.enum(['CASH', 'MOBILE_MONEY', 'BANK', 'OTHER']).default('CASH'),
  paymentReference: z.string().max(120).optional().or(z.literal('')),
  purchaseDate: z.string().optional(),
  receiptFileUrl: z.string().url().optional().or(z.literal('')),
});

export const purchaseCancelSchema = z.object({
  reason: z.string().min(3, 'Motif requis.').max(500),
});
