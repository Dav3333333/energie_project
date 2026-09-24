/**
 * Consommation à partir de deux index cumulatifs (kWh).
 * Renvoie un objet diagnostic, ne lève jamais d'exception.
 */
export function calculateConsumption(previousTotalKwh, currentTotalKwh) {
  const prev = Number(previousTotalKwh);
  const cur = Number(currentTotalKwh);

  if (!Number.isFinite(cur) || cur < 0) {
    return { ok: false, reason: 'INVALID_CURRENT', consumptionKwh: null };
  }
  if (previousTotalKwh == null) {
    // Premier relevé : pas de consommation calculable.
    return { ok: true, consumptionKwh: null, firstReading: true };
  }
  if (!Number.isFinite(prev) || prev < 0) {
    return { ok: false, reason: 'INVALID_PREVIOUS', consumptionKwh: null };
  }
  if (cur < prev) {
    return { ok: false, reason: 'BACKWARD_INDEX', consumptionKwh: null };
  }
  return { ok: true, consumptionKwh: Number((cur - prev).toFixed(3)) };
}

export function calculateTotalConsumedKwh(readings) {
  if (!Array.isArray(readings)) return 0;
  return readings
    .filter((r) => r?.status === 'VALID' && typeof r.consumptionKwh === 'number')
    .reduce((sum, r) => sum + r.consumptionKwh, 0);
}