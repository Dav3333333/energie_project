import { z } from 'zod';

export const readingCreateSchema = z.object({
  meterId: z.string().min(1),
  totalKwh: z.coerce.number().nonnegative('Index invalide.').finite(),
  readingDate: z.string().optional(), // ISO ou vide
  notes: z.string().max(500).optional().or(z.literal('')),
  evidenceImageUrl: z.string().url().optional().or(z.literal('')),
});