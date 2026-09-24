import { describe, it, expect } from 'vitest';

// Petit test unitaire du calcul de consommation d'une période (logique pure).
function invoiceConsumedAmount(consumedKwh, pricePerKwh) {
  return Number((consumedKwh * pricePerKwh).toFixed(2));
}
function invoiceRemainingAmount(remainingKwh, pricePerKwh) {
  return Number((remainingKwh * pricePerKwh).toFixed(2));
}

describe('invoice — totaux', () => {
  it('calcul montant consommé', () => {
    expect(invoiceConsumedAmount(100, 0.3)).toBe(30);
    expect(invoiceConsumedAmount(333.33, 0.15)).toBe(50);
  });
  it('calcul solde restant', () => {
    expect(invoiceRemainingAmount(50, 0.3)).toBe(15);
    expect(invoiceRemainingAmount(-5, 0.3)).toBe(-1.5);
  });
});