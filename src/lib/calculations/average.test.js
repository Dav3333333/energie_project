import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateAverageDailyConsumption,
  calculateEstimatedDaysRemaining,
  calculateEstimatedDepletionDate,
} from './average';

function ts(daysAgo) {
  return new Date(Date.now() - daysAgo * 24 * 3600 * 1000);
}

describe('calculateAverageDailyConsumption', () => {
  it('moyenne journalière sur fenêtre récente', () => {
    const readings = [
      { status: 'VALID', consumptionKwh: 10, readingDate: ts(6) },
      { status: 'VALID', consumptionKwh: 10, readingDate: ts(4) },
      { status: 'VALID', consumptionKwh: 10, readingDate: ts(1) },
    ];
    const avg = calculateAverageDailyConsumption(readings, 7);
    // 20 kWh sur ~5 jours => ~4 kWh/j
    expect(avg).toBeGreaterThan(3);
    expect(avg).toBeLessThan(5);
  });

  it('retourne null si < 2 relevés', () => {
    expect(calculateAverageDailyConsumption([], 7)).toBeNull();
    expect(calculateAverageDailyConsumption([{ status: 'VALID', consumptionKwh: 1, readingDate: ts(1) }], 7)).toBeNull();
  });

  it('retourne null si trop peu de jours', () => {
    const readings = [
      { status: 'VALID', consumptionKwh: 1, readingDate: ts(0.2) },
      { status: 'VALID', consumptionKwh: 1, readingDate: ts(0.1) },
    ];
    expect(calculateAverageDailyConsumption(readings, 7)).toBeNull();
  });

  it('ignore les relevés non VALID', () => {
    const readings = [
      { status: 'INVALID', consumptionKwh: 999, readingDate: ts(6) },
      { status: 'VALID', consumptionKwh: 10, readingDate: ts(5) },
      { status: 'VALID', consumptionKwh: 10, readingDate: ts(1) },
    ];
    const avg = calculateAverageDailyConsumption(readings, 7);
    expect(avg).toBeGreaterThan(0);
    expect(avg).toBeLessThan(5);
  });
});

describe('calculateEstimatedDaysRemaining', () => {
  it('arrondit au supérieur', () => {
    expect(calculateEstimatedDaysRemaining(100, 3)).toBe(34);
    expect(calculateEstimatedDaysRemaining(100, 4.5)).toBe(23);
  });
  it('0 si crédit épuisé', () => {
    expect(calculateEstimatedDaysRemaining(0, 3)).toBe(0);
    expect(calculateEstimatedDaysRemaining(-1, 3)).toBe(0);
  });
  it('null si conso inconnue', () => {
    expect(calculateEstimatedDaysRemaining(100, null)).toBeNull();
    expect(calculateEstimatedDaysRemaining(100, 0)).toBeNull();
  });
});

describe('calculateEstimatedDepletionDate', () => {
  it('décale la date', () => {
    const base = new Date('2025-01-01T00:00:00Z');
    const d = calculateEstimatedDepletionDate(base, 10);
    expect(d.toISOString()).toBe(new Date('2025-01-11T00:00:00Z').toISOString());
  });
  it('null si jours null', () => {
    expect(calculateEstimatedDepletionDate(new Date(), null)).toBeNull();
  });
});