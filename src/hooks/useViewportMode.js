import { useEffect, useState } from 'react';

/**
 * Retourne 'mobile' | 'tablet' | 'desktop' selon la largeur.
 * Utilise matchMedia pour de meilleures performances.
 */
export function useViewportMode() {
  const getMode = () => {
    if (typeof window === 'undefined') return 'mobile';
    const w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  };

  const [mode, setMode] = useState(getMode);

  useEffect(() => {
    const onResize = () => setMode(getMode());
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return mode;
}