import { z } from 'zod';

export const incidentCreateSchema = z.object({
  galleryId: z.string().min(1).optional(),
  shopId: z.string().nullable().optional(),
  title: z.string().min(3, 'Titre requis.').max(200),
  description: z.string().min(3, 'Description requise.').max(2000),
  category: z.enum(['METER', 'POWER', 'BILLING', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  assignedToUserId: z.string().nullable().optional(),
});

export const incidentUpdateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  assignedToUserId: z.string().nullable().optional(),
  resolutionNotes: z.string().max(2000).nullable().optional(),
});