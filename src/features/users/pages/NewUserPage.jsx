import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { useGalleries } from '@/features/galleries/hooks/useGalleries';
import { useShopsByGallery } from '@/features/shops/hooks/useShops';

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
  const isSuperAdmin = profile?.role === ROLES.SUPER_ADMIN;
  const [selectedGalleryId, setSelectedGalleryId] = useState(galleryIds?.[0] ?? '');
  const [selectedShopId, setSelectedShopId] = useState('');
  const { data: galleries = [] } = useGalleries({ status: 'ACTIVE' });
  const { data: shops = [] } = useShopsByGallery(selectedGalleryId);

  const allowedRoles =
    profile?.role === ROLES.SUPER_ADMIN
      ? Object.values(ROLES)
      : [ROLES.TECHNICIAN, ROLES.SHOP_OWNER, ROLES.SHOP_WORKER];

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: ROLES.SHOP_OWNER },
  });
  const selectedRole = useWatch({ control, name: 'role' });
  const needsShop = [ROLES.SHOP_OWNER, ROLES.SHOP_WORKER].includes(selectedRole);

  const onSubmit = async (values) => {
    if (values.role !== ROLES.SUPER_ADMIN && !selectedGalleryId) {
      toast.error('Sélectionnez une galerie.');
      return;
    }
    if (needsShop && !selectedShopId) {
      toast.error('Sélectionnez une boutique.');
      return;
    }
    try {
      const payload = {
        ...values,
        phone: values.phone || null,
        galleryIds: values.role === ROLES.SUPER_ADMIN || !selectedGalleryId ? [] : [selectedGalleryId],
        shopIds: needsShop ? [selectedShopId] : [],
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
          {isSuperAdmin ? (
            <label className="block">
              <span className="text-sm font-medium mb-1.5 block">Galerie</span>
              <select
                value={selectedGalleryId}
                onChange={(event) => {
                  setSelectedGalleryId(event.target.value);
                  setSelectedShopId('');
                }}
                className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]"
              >
                <option value="">— Aucune galerie —</option>
                {galleries.map((gallery) => (
                  <option key={gallery.id} value={gallery.id}>
                    {gallery.name} ({gallery.code})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-[var(--c-text-muted)]">
              Galerie : {galleries.find((gallery) => gallery.id === selectedGalleryId)?.name ?? selectedGalleryId}
            </p>
          )}
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
          {needsShop && (
            <label className="block">
              <span className="text-sm font-medium mb-1.5 block">Boutique</span>
              <select
                value={selectedShopId}
                onChange={(event) => setSelectedShopId(event.target.value)}
                disabled={!selectedGalleryId}
                className="w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] disabled:opacity-60"
              >
                <option value="">— Sélectionner une boutique —</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
              {selectedGalleryId && shops.length === 0 && (
                <span className="block mt-1 text-xs text-[var(--c-text-muted)]">
                  Aucune boutique dans cette galerie.
                </span>
              )}
            </label>
          )}
        </form>
      </MobileFormLayout>
    </AppShell>
  );
}