import { formatKwh } from '@/lib/formatters';

export default function KwhDisplay({ value, withUnit = true, className = '' }) {
  return <span className={className}>{formatKwh(value, { withUnit })}</span>;
}