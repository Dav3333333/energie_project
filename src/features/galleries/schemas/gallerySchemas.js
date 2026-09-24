import { z } from 'zod';

export const galleryCreateSchema = z.object({
  name: z.string().min(2, 'Nom requis (2 caractères min.).').max(120),
  code: z
    .string()
    .min(2, 'Code requis.')
    .max(30)
    .regex(/^[A-Z0-9-]+$/, 'Majuscules, chiffres et tiret uniquement.'),
  address: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(80).optional().or(z.literal('')),
  country: z.string().max(80).optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  email: z.string().email('Email invalide.').optional().or(z.literal('')),
  currency: z.enum(['USD', 'CDF']),
  defaultPricePerKwh: z.coerce.number().nonnegative('Prix invalide.'),
  lowCreditThresholdKwh: z.coerce.number().nonnegative().optional(),
  criticalCreditThresholdKwh: z.coerce.number().nonnegative().optional(),
});

export const galleryUpdateSchema = galleryCreateSchema.partial();