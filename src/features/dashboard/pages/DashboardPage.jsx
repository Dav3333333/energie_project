import { useAuth } from '@/features/auth/hooks/useAuth';
import AppShell from '@/components/layout/AppShell';
import { ROLES } from '@/constants/roles';
import SuperAdminDashboard from '../components/SuperAdminDashboard';
import GalleryAdminDashboard from '../components/GalleryAdminDashboard';
import TechnicianDashboard from '../components/TechnicianDashboard';
import ShopOwnerDashboard from '../components/ShopOwnerDashboard';
import ShopWorkerDashboard from '../components/ShopWorkerDashboard';

export default function DashboardPage() {
  const { profile } = useAuth();

  const inner = (() => {
    switch (profile?.role) {
      case ROLES.SUPER_ADMIN:
        return <SuperAdminDashboard />;
      case ROLES.GALLERY_ADMIN:
        return <GalleryAdminDashboard />;
      case ROLES.TECHNICIAN:
        return <TechnicianDashboard />;
      case ROLES.SHOP_OWNER:
        return <ShopOwnerDashboard />;
      case ROLES.SHOP_WORKER:
        return <ShopWorkerDashboard />;
      default:
        return null;
    }
  })();

  return (
    <AppShell title="Tableau de bord">
      <div className="space-y-5">{inner}</div>
    </AppShell>
  );
}