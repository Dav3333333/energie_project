import { describe, it, expect } from 'vitest';
import {
  calculateTotalPurchasedKwh,
  calculateRemainingKwh,
  calculateRemainingAmount,
  determineBalanceStatus,
} from './balance';
import { BALANCE_STATUS } from './constants';

describe('calculateTotalPurchasedKwh', () => {
  it('ignore les CANCELLED', () => {
    expect(
      calculateTotalPurchasedKwh([
        { status: 'VALID', purchasedKwh: 100 },
        { status: 'CANCELLED', purchasedKwh: 9999 },
        { status: 'VALID', purchasedKwh: 50 },
      ]),
    ).toBe(150);
  });
});

describe('calculateRemainingKwh', () => {
  it('soustraction simple', () => {
    expect(calculateRemainingKwh(200, 30)).toBe(170);
  });
  it('peut être négatif', () => {
    expect(calculateRemainingKwh(10, 50)).toBe(-40);
  });
});

describe('calculateRemainingAmount', () => {
  it('multiplie et arrondit', () => {
    expect(calculateRemainingAmount(10, 2.5)).toBe(25);
    expect(calculateRemainingAmount(3.333, 0.5)).toBe(1.67);
  });
});

describe('determineBalanceStatus', () => {
  const low = 50;
  const crit = 10;
  it('EXHAUSTED si <= 0', () => {
    expect(determineBalanceStatus(0, low, crit)).toBe(BALANCE_STATUS.EXHAUSTED);
    expect(determineBalanceStatus(-1, low, crit)).toBe(BALANCE_STATUS.EXHAUSTED);
  });
  it('CRITICAL si <= critique', () => {
    expect(determineBalanceStatus(5, low, crit)).toBe(BALANCE_STATUS.CRITICAL);
    expect(determineBalanceStatus(10, low, crit)).toBe(BALANCE_STATUS.CRITICAL);
  });
  it('LOW si <= seuil faible', () => {
    expect(determineBalanceStatus(30, low, crit)).toBe(BALANCE_STATUS.LOW);
    expect(determineBalanceStatus(50, low, crit)).toBe(BALANCE_STATUS.LOW);
  });
  it('NORMAL sinon', () => {
    expect(determineBalanceStatus(100, low, crit)).toBe(BALANCE_STATUS.NORMAL);
  });
  it('UNKNOWN si valeur non finie', () => {
    expect(determineBalanceStatus(NaN, low, crit)).toBe(BALANCE_STATUS.UNKNOWN);
  });
});