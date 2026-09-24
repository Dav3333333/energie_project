import { useState } from 'react';
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
  const mode = useViewportMode();
  const isMobile = mode === 'mobile';
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-dvh bg-[var(--c-bg)]">
      <TopBar
        title={title}
        showBack={showBack}
        onBack={onBack}
        actions={topBarActions}
        onMenuClick={showDrawer ? () => setDrawerOpen(true) : undefined}
      />

      <OfflineBanner />

      <main
        className={[
          'flex-1 app-scroll screen-pad',
          isMobile ? 'above-bottomnav pt-4' : 'pt-6 pb-8',
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