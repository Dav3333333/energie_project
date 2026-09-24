import {
  BALANCE_STATUS,
  DEFAULT_LOW_THRESHOLD,
  DEFAULT_CRITICAL_THRESHOLD,
} from './constants';

export function calculateTotalPurchasedKwh(purchases) {
  if (!Array.isArray(purchases)) return 0;
  return purchases
    .filter((p) => p?.status === 'VALID')
    .reduce((sum, p) => sum + Number(p.purchasedKwh ?? 0), 0);
}

export function calculateRemainingKwh(totalPurchasedKwh, totalConsumedKwh) {
  return Number((Number(totalPurchasedKwh ?? 0) - Number(totalConsumedKwh ?? 0)).toFixed(3));
}

export function calculateRemainingAmount(remainingKwh, pricePerKwh) {
  if (!Number.isFinite(Number(pricePerKwh))) return 0;
  return Number((Number(remainingKwh ?? 0) * Number(pricePerKwh)).toFixed(2));
}

export function determineBalanceStatus(remainingKwh, lowThreshold, criticalThreshold) {
  const low = Number(lowThreshold ?? DEFAULT_LOW_THRESHOLD);
  const crit = Number(criticalThreshold ?? DEFAULT_CRITICAL_THRESHOLD);
  if (!Number.isFinite(remainingKwh)) return BALANCE_STATUS.UNKNOWN;
  if (remainingKwh <= 0) return BALANCE_STATUS.EXHAUSTED;
  if (remainingKwh <= crit) return BALANCE_STATUS.CRITICAL;
  if (remainingKwh <= low) return BALANCE_STATUS.LOW;
  return BALANCE_STATUS.NORMAL;
}