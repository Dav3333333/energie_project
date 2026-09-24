import { Battery, BatteryLow, BatteryWarning, BatteryFull } from 'lucide-react';
import { formatCurrency, formatKwh, formatDate } from '@/lib/formatters';
import StatusBadge from './StatusBadge';

const ICONS = {
  NORMAL: BatteryFull,
  LOW: BatteryLow,
  CRITICAL: BatteryWarning,
  EXHAUSTED: BatteryLow,
  UNKNOWN: Battery,
};

const TONES = {
  NORMAL: 'text-success',
  LOW: 'text-warning',
  CRITICAL: 'text-danger',
  EXHAUSTED: 'text-danger',
  UNKNOWN: 'text-[var(--c-text-muted)]',
};

export default function CreditBalanceCard({ shop }) {
  if (!shop) return null;
  const status = shop.balanceStatus ?? 'UNKNOWN';
  const Icon = ICONS[status] ?? Battery;

  return (
    <div className="rounded-2xl bg-[var(--c-surface)] border border-[var(--c-border)] p-4 shadow-card">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={TONES[status]} size={20} />
          <span className="font-semibold">Crédit énergétique</span>
        </div>
        <StatusBadge status={status} />
      </header>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-[var(--c-text-muted)]">Reste</p>
          <p className="text-xl font-bold">{formatKwh(shop.remainingKwh)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--c-text-muted)]">Valeur estimée</p>
          <p className="text-xl font-bold">
            {formatCurrency(shop.remainingAmount, 'USD')}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[var(--c-text-muted)]">
        <div>
          <p>Moy. journalière</p>
          <p className="font-medium text-[var(--c-text)]">
            {shop.averageDailyConsumptionKwh != null
              ? formatKwh(shop.averageDailyConsumptionKwh)
              : '—'}
          </p>
        </div>
        <div>
          <p>Autonomie estimée</p>
          <p className="font-medium text-[var(--c-text)]">
            {shop.estimatedDaysRemaining != null
              ? `${shop.estimatedDaysRemaining} jour(s)`
              : '—'}
          </p>
        </div>
      </div>

      {shop.estimatedDepletionDate && (
        <p className="mt-3 text-xs text-[var(--c-text-muted)]">
          Épuisement estimé le{' '}
          <span className="font-medium text-[var(--c-text)]">
            {formatDate(shop.estimatedDepletionDate)}
          </span>
        </p>
      )}
    </div>
  );
}