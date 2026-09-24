import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViewportMode } from '@/hooks/useViewportMode';
import TopBar from './TopBar';
import BottomNavigation from './BottomNavigation';
import MobileDrawer from './MobileDrawer';
import OfflineBanner from '@/components/pwa/OfflineBanner';

/**
 * Coquille applicative mobile-first.
 * - Mobile : TopBar sticky + contenu scrollable + BottomNavigation fixe.
 * - Desktop : TopBar sticky + contenu scrollable (BottomNavigation masquée, remplacée par sidebar à l'ÉTAPE 3).
 */
export default function AppShell({
  children,
  title,
  showBack = false,
  onBack,
  topBarActions = null,
  showDrawer = true,
}) {
  const navigate = useNavigate();
  const mode = useViewportMode();
  const isMobile = mode === 'mobile';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const handleBack = onBack ?? (() => navigate(-1));

  return (
    <div className="flex flex-col min-h-dvh bg-[var(--c-bg)]">
      <TopBar
        title={title}
        showBack={showBack}
        onBack={handleBack}
        actions={topBarActions}
        onMenuClick={showDrawer ? () => setDrawerOpen(true) : undefined}
      />

      <OfflineBanner />

      <main
        className={[
          'flex-1 app-scroll screen-pad',
          isMobile
            ? 'above-bottomnav pt-[var(--scroll-top-offset)]'
            : 'pt-[var(--scroll-top-offset)] pb-8',
        ].join(' ')}
        id="main-content"
      >
        {children}
      </main>

      {isMobile && <BottomNavigation />}
      {showDrawer && (
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      )}
    </div>
  );
}