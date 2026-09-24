import { z } from 'zod';

export const shopCreateSchema = z.object({
  galleryId: z.string().min(1),
  name: z.string().min(2).max(120),
  code: z.string().min(1).max(30),
  description: z.string().max(500).optional().or(z.literal('')),
  location: z.string().max(120).optional().or(z.literal('')),
  customPricePerKwh: z.coerce.number().nonnegative().nullable().optional(),
  lowCreditThresholdKwh: z.coerce.number().nonnegative().nullable().optional(),
  criticalCreditThresholdKwh: z.coerce.number().nonnegative().nullable().optional(),
});

export const shopUpdateSchema = shopCreateSchema.partial().omit({ galleryId: true });