import { format as fmtDate, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const CURRENCY_LOCALE = { USD: 'en-US', CDF: 'fr-CD' };

export function formatCurrency(amount, currency = 'USD') {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatKwh(value, { withUnit = true } = {}) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);
  return withUnit ? `${formatted} kWh` : formatted;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate(); // Firestore Timestamp
  if (typeof value === 'string') return parseISO(value);
  return null;
}

export function formatDateTime(value, pattern = 'dd/MM/yyyy HH:mm') {
  const d = toDate(value);
  return d ? fmtDate(d, pattern, { locale: fr }) : '—';
}

export function formatDate(value, pattern = 'dd/MM/yyyy') {
  return formatDateTime(value, pattern);
}