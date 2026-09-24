const MIN_DAYS_FOR_AVERAGE = 2;
const MIN_DAILY_CONSUMPTION = 0.01; // kWh/j — seuil sous lequel on considère "données insuffisantes"

/**
 * Moyenne journalière sur les N derniers jours à partir des relevés VALID.
 * @param {Array} readings - relevés VALID triés ou non par date
 * @param {number} periodDays - fenêtre (7, 14, 30)
 * @returns {number|null} kWh/j, ou null si données insuffisantes
 */
export function calculateAverageDailyConsumption(readings, periodDays = 7) {
  if (!Array.isArray(readings) || readings.length < 2) return null;

  const valid = readings
    .filter((r) => r?.status === 'VALID' && typeof r.consumptionKwh === 'number' && r.readingDate)
    .map((r) => ({ ...r, date: toDate(r.readingDate) }))
    .sort((a, b) => a.date - b.date);

  if (valid.length < 2) return null;

  const now = Date.now();
  const cutoff = now - periodDays * 24 * 3600 * 1000;
  const inWindow = valid.filter((r) => r.date.getTime() >= cutoff);

  // Pas assez de relevés dans la fenêtre : élargir au dernier relevé et son précédent.
  const used = inWindow.length >= 2 ? inWindow : valid.slice(-2);

  const totalConsumption = used.slice(1).reduce((sum, r) => sum + r.consumptionKwh, 0);
  const spanMs = used[used.length - 1].date - used[0].date;
  const spanDays = spanMs / (24 * 3600 * 1000);

  if (spanDays < MIN_DAYS_FOR_AVERAGE) return null;

  const avg = totalConsumption / spanDays;
  return avg < MIN_DAILY_CONSUMPTION ? null : Number(avg.toFixed(3));
}

export function calculateEstimatedDaysRemaining(remainingKwh, averageDailyConsumptionKwh) {
  if (!Number.isFinite(remainingKwh) || remainingKwh <= 0) return 0;
  if (!Number.isFinite(averageDailyConsumptionKwh) || averageDailyConsumptionKwh <= 0) return null;
  return Math.ceil(remainingKwh / averageDailyConsumptionKwh);
}

export function calculateEstimatedDepletionDate(baseDate, estimatedDaysRemaining) {
  if (!Number.isFinite(estimatedDaysRemaining) || estimatedDaysRemaining == null) return null;
  const base = baseDate instanceof Date ? baseDate : new Date(baseDate);
  const d = new Date(base.getTime() + estimatedDaysRemaining * 24 * 3600 * 1000);
  return d;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return null;
}