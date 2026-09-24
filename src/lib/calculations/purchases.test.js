import { describe, it, expect } from 'vitest';
import { calculateTotalPurchasedKwh } from './balance';

describe('calculateTotalPurchasedKwh — cas achats', () => {
  it('additionne uniquement les VALID', () => {
    const total = calculateTotalPurchasedKwh([
      { status: 'VALID', purchasedKwh: 100 },
      { status: 'CANCELLED', purchasedKwh: 500 },
      { status: 'VALID', purchasedKwh: 200 },
    ]);
    expect(total).toBe(300);
  });
  it('tableau vide → 0', () => {
    expect(calculateTotalPurchasedKwh([])).toBe(0);
  });
});