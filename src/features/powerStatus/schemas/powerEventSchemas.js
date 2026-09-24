import { z } from 'zod';

export const powerEventSchema = z.object({
  galleryId: z.string().min(1),
  shopId: z.string().nullable().optional(),
  powerStatus: z.enum(['AVAILABLE', 'OUTAGE', 'UNSTABLE', 'UNKNOWN']),
  energySource: z.enum(['GRID', 'GENERATOR', 'SOLAR', 'BATTERY', 'UNKNOWN']).default('UNKNOWN'),
  description: z.string().max(500).optional().or(z.literal('')),
});