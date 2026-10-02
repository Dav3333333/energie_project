import { z } from 'zod';

export const meterCreateSchema = z.object({
  galleryId: z.string().min(1, 'Sélectionnez une galerie.'),
  shopId: z.string().optional().default(''),
  type: z.enum(['MAIN', 'SUB_METER']),
  parentMeterId: z.string().optional().default(''),
  name: z.string().min(2).max(120),
  serialNumber: z.string().max(80).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  initialKwh: z.coerce.number().nonnegative(),
}).superRefine((meter, context) => {
  if (meter.type === 'SUB_METER' && !meter.shopId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['shopId'], message: 'Sélectionnez une boutique.' });
  }
});

export const meterUpdateSchema = z.object({
  name: z.string().min(2).max(120),
  serialNumber: z.string().max(80).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
});
