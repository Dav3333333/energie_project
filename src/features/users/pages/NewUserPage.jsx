import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MobileFormLayout from '@/components/forms/MobileFormLayout';
import { callables, callableError } from '@/lib/firebase/callables';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLES, ROLE_LABELS_FR } from '@/constants/roles';

const schema = z.object({
  email: z.string().email('Email invalide.'),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum.'),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9._]+$/, 'Minuscules, chiffres, point, underscore.'),
  firstName: z.string().min(1, 'Prénom requis.'),
  lastName: z.string().min(1, 'Nom requis.'),
  phone: z.string().max(30).optional().or(z.literal('')),
  role: z.enum(Object.values(ROLES)),
});

export default function NewUserPage() {
  const navigate = useNavigate();
  const { profile, galleryIds } = useAuth();
  const galleryId = galleryIds?.[0];

  const allowedRoles =
    profile?.role === ROLES.SUPER_ADMIN
      ? Object.values(ROLES)
      : [ROLES.TECHNICIAN, ROLES.SHOP_OWNER, ROLES.SHOP_WORKER];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: ROLES.SHOP_OWNER },
  });

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        phone: values.phone || null,
        galleryIds: galleryId ? [galleryId] : [],
        shopIds: [],
      };
      await callables.createManagedUser(payload);
      toast.success('Utilisateur créé.');
      navigate('/users', { replace: true });
    } catch (err) {
      toast.error(callableError(err).message);
    }
  };

  return (
    <AppShell title="Nouvel utilisateur" showBack>
      <PageHeader title="Nouvel utilisateur" />
      <MobileFormLayout
        footer={
          <Button type="submit" size="lg" form="user-form" loading={isSubmitting}>
            Créer l&apos;utilisateur
          </Button>
        }
      >
        <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="off"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Nom d'utilisateur"
            autoComplete="off"
            hint="Minuscules uniquement."
            error={errors.username?.message}
            {...register('username')}
          />
          <Input
            label="Mot de passe initial"
            type="password"
            autoComplete="new-password"
            hint="8 caractères minimum. À communiquer à l'utilisateur."
            error={errors.password?.message}
            {...register('password')}
          />
          <Input label="Prénom" error={errors.firstName?.message} {...register('firstName')} />
          <Input label="Nom" error={errors.lastName?.message} {...register('lastName')} />
          <Input label="Téléphone" error={errors.phone?.message} {...register('phone')} />
          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Rôle</span>
            <select
              {...register('role')}
              className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]"
            >
              {allowedRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS_FR[r]}
                </option>
              ))}
            </select>
          </label>
        </form>
      </MobileFormLayout>
    </AppShell>
  );
}