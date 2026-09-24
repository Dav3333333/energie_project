import { describe, it, expect } from 'vitest';
import { calculateConsumption, calculateTotalConsumedKwh } from './consumption';

describe('calculateConsumption', () => {
  it('calcule une consommation normale', () => {
    const r = calculateConsumption(100, 150);
    expect(r.ok).toBe(true);
    expect(r.consumptionKwh).toBe(50);
  });
  it('retourne null pour premier relevé', () => {
    const r = calculateConsumption(null, 50);
    expect(r.ok).toBe(true);
    expect(r.consumptionKwh).toBeNull();
    expect(r.firstReading).toBe(true);
  });
  it('refuse un index négatif', () => {
    expect(calculateConsumption(10, -5).ok).toBe(false);
  });
  it('refuse un index en recul', () => {
    const r = calculateConsumption(100, 90);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('BACKWARD_INDEX');
  });
  it('refuse un précédent invalide', () => {
    const r = calculateConsumption(-1, 50);
    expect(r.ok).toBe(false);
  });
});

describe('calculateTotalConsumedKwh', () => {
  it('somme uniquement les VALID', () => {
    const total = calculateTotalConsumedKwh([
      { status: 'VALID', consumptionKwh: 10 },
      { status: 'INVALID', consumptionKwh: 999 },
      { status: 'VALID', consumptionKwh: 5 },
      { status: 'VALID', consumptionKwh: null },
    ]);
    expect(total).toBe(15);
  });
  it('tolère un argument non tableau', () => {
    expect(calculateTotalConsumedKwh(null)).toBe(0);
  });
});