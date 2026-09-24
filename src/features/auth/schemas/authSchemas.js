import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Identifiant requis.').max(120),
  password: z.string().min(6, 'Mot de passe requis.'),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(3, 'Email ou identifiant requis.'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6, 'Mot de passe actuel requis.'),
    newPassword: z.string().min(8, '8 caractères minimum.'),
    confirmPassword: z.string().min(8, '8 caractères minimum.'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Les mots de passe ne correspondent pas.',
  });