import { z } from 'zod';

export const invoiceGenerateSchema = z
  .object({
    meterId: z.string().min(1, 'Sélectionnez un compteur.'),
    type: z.enum(['INVOICE', 'STATEMENT']).default('STATEMENT'),
    periodStart: z.string().min(1, 'Date de début requise.'),
    periodEnd: z.string().min(1, 'Date de fin requise.'),
  })
  .refine((d) => new Date(d.periodEnd) > new Date(d.periodStart), {
    path: ['periodEnd'],
    message: 'La date de fin doit être postérieure à la date de début.',
  });
