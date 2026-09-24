export const USER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  ARCHIVED: 'ARCHIVED',
});

export const BALANCE_STATUS = Object.freeze({
  NORMAL: 'NORMAL',
  LOW: 'LOW',
  CRITICAL: 'CRITICAL',
  EXHAUSTED: 'EXHAUSTED',
  UNKNOWN: 'UNKNOWN',
});

export const POWER_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  OUTAGE: 'OUTAGE',
  UNSTABLE: 'UNSTABLE',
  UNKNOWN: 'UNKNOWN',
});

export const POWER_STATUS_LABELS_FR = Object.freeze({
  AVAILABLE: 'Courant disponible',
  OUTAGE: 'Coupure',
  UNSTABLE: 'Courant instable',
  UNKNOWN: 'Inconnu',
});

export const BALANCE_STATUS_LABELS_FR = Object.freeze({
  NORMAL: 'Normal',
  LOW: 'Faible',
  CRITICAL: 'Critique',
  EXHAUSTED: 'Épuisé',
  UNKNOWN: 'Inconnu',
});