import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '@/features/auth/pages/LoginPage';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import ProfilePage from '@/features/auth/pages/ProfilePage';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import GalleriesPage from '@/features/galleries/pages/GalleriesPage';
import NewGalleryPage from '@/features/galleries/pages/NewGalleryPage';
import GalleryDetailPage from '@/features/galleries/pages/GalleryDetailPage';
import ShopsPage from '@/features/shops/pages/ShopsPage';
import NewShopPage from '@/features/shops/pages/NewShopPage';
import ShopDetailPage from '@/features/shops/pages/ShopDetailPage';
import MetersPage from '@/features/meters/pages/MetersPage';
import NewMeterPage from '@/features/meters/pages/NewMeterPage';
import MeterDetailPage from '@/features/meters/pages/MeterDetailPage';
import ReadingsPage from '@/features/readings/pages/ReadingsPage';
import NewReadingPage from '@/features/readings/pages/NewReadingPage';
import PurchasesPage from '@/features/energyPurchases/pages/PurchasesPage';
import NewPurchasePage from '@/features/energyPurchases/pages/NewPurchasePage';
import PurchaseDetailPage from '@/features/energyPurchases/pages/PurchaseDetailPage';
import AlertsPage from '@/features/alerts/pages/AlertsPage';
import IncidentsPage from '@/features/incidents/pages/IncidentsPage';
import NewIncidentPage from '@/features/incidents/pages/NewIncidentPage';
import IncidentDetailPage from '@/features/incidents/pages/IncidentDetailPage';
import PowerStatusPage from '@/features/powerStatus/pages/PowerStatusPage';
import InvoicesPage from '@/features/invoices/pages/InvoicesPage';
import NewInvoicePage from '@/features/invoices/pages/NewInvoicePage';
import InvoiceDetailPage from '@/features/invoices/pages/InvoiceDetailPage';
import ReportsPage from '@/features/reports/pages/ReportsPage';
import UsersPage from '@/features/users/pages/UsersPage';
import NewUserPage from '@/features/users/pages/NewUserPage';
import UserDetailPage from '@/features/users/pages/UserDetailPage';
import SettingsPage from '@/features/settings/pages/SettingsPage';
import NotFound from '@/components/common/NotFound';
import { ROLES } from '@/constants/roles';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        <Route path="/galleries" element={<GalleriesPage />} />
        <Route path="/galleries/:galleryId" element={<GalleryDetailPage />} />
        <Route path="/shops" element={<ShopsPage />} />
        <Route path="/shops/:shopId" element={<ShopDetailPage />} />
        <Route path="/meters" element={<MetersPage />} />
        <Route path="/meters/:meterId" element={<MeterDetailPage />} />
        <Route path="/readings" element={<ReadingsPage />} />
        <Route path="/energy-purchases" element={<PurchasesPage />} />
        <Route path="/energy-purchases/:purchaseId" element={<PurchaseDetailPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/power-status" element={<PowerStatusPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/:invoiceId" element={<InvoiceDetailPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/incidents/:incidentId" element={<IncidentDetailPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={[ROLES.SUPER_ADMIN]} />}>
        <Route path="/galleries/new" element={<NewGalleryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN]} />}>
        <Route path="/shops/new" element={<NewShopPage />} />
        <Route path="/energy-purchases/new" element={<NewPurchasePage />} />
        <Route path="/invoices/new" element={<NewInvoicePage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/new" element={<NewUserPage />} />
        <Route path="/users/:uid" element={<UserDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN, ROLES.TECHNICIAN]} />
        }
      >
        <Route path="/meters/new" element={<NewMeterPage />} />
        <Route path="/readings/new" element={<NewReadingPage />} />
        <Route path="/incidents/new" element={<NewIncidentPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}