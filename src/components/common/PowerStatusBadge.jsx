import { Zap, ZapOff, AlertTriangle, HelpCircle } from 'lucide-react';

const MAP = {
  AVAILABLE: { label: 'Disponible', className: 'bg-success-light text-success-dark', Icon: Zap },
  OUTAGE: { label: 'Coupure', className: 'bg-danger-light text-danger-dark', Icon: ZapOff },
  UNSTABLE: { label: 'Instable', className: 'bg-warning-light text-warning-dark', Icon: AlertTriangle },
  UNKNOWN: { label: 'Inconnu', className: 'bg-slate-100 text-slate-700', Icon: HelpCircle },
};

export default function PowerStatusBadge({ status = 'UNKNOWN', className = '' }) {
  const conf = MAP[status] ?? MAP.UNKNOWN;
  const { Icon } = conf;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${conf.className} ${className}`}
    >
      <Icon size={12} /> {conf.label}
    </span>
  );
}