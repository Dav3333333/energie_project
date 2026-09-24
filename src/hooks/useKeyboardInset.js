import { useEffect, useState } from 'react';

/**
 * Retourne la hauteur du clavier virtuel (approx).
 * Utile pour décaler un CTA fixe ou un BottomSheet au-dessus du clavier.
 * Basé sur visualViewport (supporté iOS 13+ et Android moderne).
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const diff = window.innerHeight - vv.height - vv.offsetTop;
      setInset(diff > 80 ? diff : 0); // ignore les petits deltas (barre URL)
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}