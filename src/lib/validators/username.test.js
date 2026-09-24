import { describe, it, expect } from 'vitest';
import { normalizeUsername, isValidUsername, isEmailInput } from './username';

describe('username — normalizeUsername', () => {
  it('met en minuscules et supprime les espaces', () => {
    expect(normalizeUsername('  John.Doe  ')).toBe('john.doe');
  });
  it('accepte une chaîne vide', () => {
    expect(normalizeUsername('')).toBe('');
    expect(normalizeUsername(null)).toBe('');
  });
});

describe('username — isValidUsername', () => {
  it('valide les formats acceptés', () => {
    expect(isValidUsername('abc')).toBe(true);
    expect(isValidUsername('john.doe')).toBe(true);
    expect(isValidUsername('a_1.b')).toBe(true);
    expect(isValidUsername('user1234567890123456789012345')).toBe(true);
  });
  it('refuse les formats invalides', () => {
    expect(isValidUsername('ab')).toBe(false);           // trop court
    expect(isValidUsername('John')).toBe(false);         // majuscule
    expect(isValidUsername('jean paul')).toBe(false);    // espace
    expect(isValidUsername('jean-paul')).toBe(false);    // tiret
    expect(isValidUsername('jean@paul')).toBe(false);
  });
});

describe('username — isEmailInput', () => {
  it('détecte un email', () => {
    expect(isEmailInput('a@b.com')).toBe(true);
    expect(isEmailInput('john.doe')).toBe(false);
    expect(isEmailInput('')).toBe(false);
  });
});