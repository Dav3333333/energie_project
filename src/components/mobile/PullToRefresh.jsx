import { useEffect, useRef, useState } from 'react';

/**
 * Pull-to-refresh maison (le navigateur en PWA désactive le sien).
 * À utiliser sur les écrans de liste. Rafraîchit via callback async.
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const threshold = 70;

  const onTouchStart = (e) => {
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e) => {
    if (window.scrollY > 0) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPullDistance(Math.min(dy * 0.5, threshold + 20));
  };
  const onTouchEnd = async () => {
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="relative"
    >
      <div
        className="absolute inset-x-0 top-0 flex justify-center transition-transform"
        style={{ transform: `translateY(${pullDistance}px)` }}
        aria-hidden
      >
        {(pullDistance > 0 || refreshing) && (
          <div className="text-xs text-[var(--c-text-muted)] py-2">
            {refreshing ? 'Actualisation…' : 'Tirez pour actualiser'}
          </div>
        )}
      </div>
      <div
        style={{
          transform: `translateY(${refreshing ? 40 : pullDistance * 0.4}px)`,
          transition: pullDistance === 0 ? 'transform 200ms ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}