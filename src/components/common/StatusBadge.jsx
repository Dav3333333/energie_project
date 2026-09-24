const TONES = {
  ACTIVE: 'bg-success-light text-success-dark',
  INACTIVE: 'bg-slate-200 text-slate-700',
  ARCHIVED: 'bg-slate-200 text-slate-600',
  MAINTENANCE: 'bg-warning-light text-warning-dark',

  NORMAL: 'bg-success-light text-success-dark',
  LOW: 'bg-warning-light text-warning-dark',
  CRITICAL: 'bg-danger-light text-danger-dark',
  EXHAUSTED: 'bg-danger text-white',
  UNKNOWN: 'bg-slate-200 text-slate-600',

  AVAILABLE: 'bg-success-light text-success-dark',
  OUTAGE: 'bg-danger-light text-danger-dark',
  UNSTABLE: 'bg-warning-light text-warning-dark',

  VALID: 'bg-success-light text-success-dark',
  INVALID: 'bg-slate-200 text-slate-600',
  CORRECTED: 'bg-warning-light text-warning-dark',
  CANCELLED: 'bg-danger-light text-danger-dark',
};

const LABELS_FR = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  ARCHIVED: 'Archivé',
  MAINTENANCE: 'Maintenance',
  NORMAL: 'Normal',
  LOW: 'Faible',
  CRITICAL: 'Critique',
  EXHAUSTED: 'Épuisé',
  UNKNOWN: 'Inconnu',
  AVAILABLE: 'Disponible',
  OUTAGE: 'Coupure',
  UNSTABLE: 'Instable',
  VALID: 'Valide',
  INVALID: 'Invalide',
  CORRECTED: 'Corrigé',
  CANCELLED: 'Annulé',
};

export default function StatusBadge({ status, className = '' }) {
  if (!status) return null;
  const tone = TONES[status] ?? 'bg-slate-200 text-slate-700';
  const label = LABELS_FR[status] ?? status;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tone} ${className}`}
    >
      {label}
    </span>
  );
}