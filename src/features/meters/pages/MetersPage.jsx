import { Link, useNavigate } from 'react-router-dom';
import { Plus, Gauge } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/common/PageHeader';
import TouchCard from '@/components/mobile/TouchCard';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import Button from '@/components/ui/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMetersAcrossScope } from '../hooks/useMeters';
import { ROLES } from '@/constants/roles';
import { useGalleries } from '@/features/galleries/hooks/useGalleries';
import { useShopsByIds } from '@/features/shops/hooks/useShops';

export default function MetersPage() {
  const { profile, galleryIds } = useAuth();
  const navigate = useNavigate();
  const scopeGalleryIds = profile?.role === ROLES.SUPER_ADMIN ? null : (galleryIds ?? []);
  const { data: meters, isLoading } = useMetersAcrossScope(scopeGalleryIds, { status: 'ACTIVE' });
  const { data: galleries = [] } = useGalleries();
  const galleryById = Object.fromEntries(galleries.map((gallery) => [gallery.id, gallery]));
  const shopIds = [...new Set((meters ?? []).map((meter) => meter.shopId).filter(Boolean))];
  const { data: shops = [] } = useShopsByIds(shopIds);
  const shopById = Object.fromEntries(shops.map((shop) => [shop.id, shop]));

  return (
    <AppShell title="Compteurs">
      <PageHeader
        title="Compteurs"
        subtitle={`${meters?.length ?? 0} résultat(s)`}
        actions={
          [ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN].includes(profile?.role) && (
            <Button size="sm" onClick={() => navigate('/meters/new')}>
              <Plus size={16} /> Nouveau
            </Button>
          )
        }
      />

      <div className="mt-2 space-y-3">
        {isLoading ? (
          <LoadingState />
        ) : meters?.length ? (
          meters.map((m) => (
            <Link key={m.id} to={`/meters/${m.id}`} className="block">
              <TouchCard
                interactive
                title={m.name}
                subtitle={`${m.code} · ${m.type === 'MAIN' ? 'Compteur général' : `Sous-compteur · ${shopById[m.shopId]?.name ?? 'Boutique'}`} · ${galleryById[m.galleryId]?.name ?? 'Galerie'}`}
                trailing={<StatusBadge status={m.status} />}
              />
            </Link>
          ))
        ) : (
          <EmptyState icon={<Gauge size={28} />} title="Aucun compteur" />
        )}
      </div>
    </AppShell>
  );
}
