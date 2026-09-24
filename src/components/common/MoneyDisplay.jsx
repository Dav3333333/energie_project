import { formatCurrency } from '@/lib/formatters';

export default function MoneyDisplay({ amount, currency = 'USD', className = '' }) {
  return <span className={className}>{formatCurrency(amount, currency)}</span>;
}