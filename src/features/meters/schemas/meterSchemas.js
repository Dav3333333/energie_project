import { z } from 'zod';

export const meterCreateSchema = z.object({
  shopId: z.string().min(1),
  type: z.enum(['MAIN', 'SUB_METER']),
  code: z.string().min(1).max(30),
  name: z.string().min(2).max(120),
  serialNumber: z.string().max(80).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  initialKwh: z.coerce.number().nonnegative(),
});

export const meterUpdateSchema = meterCreateSchema.partial().omit({ shopId: true, type: true, code: true, initialKwh: true });