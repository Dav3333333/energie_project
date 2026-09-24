/**
 * Retour haptique léger, no-op si non supporté (iOS Safari ne l'expose pas).
 */
export function useHaptics() {
  const tap = (ms = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  };
  return { tap };
}