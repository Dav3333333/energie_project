export default function StatCard({ label, value, hint, tone = 'default', icon = null }) {
  const tones = {
    default: 'text-[var(--c-text)]',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    muted: 'text-[var(--c-text-muted)]',
  };
  return (
    <div className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-3 shadow-card">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--c-text-muted)]">{label}</span>
        {icon && <span className="text-[var(--c-text-muted)]">{icon}</span>}
      </div>
      <p className={`text-lg font-semibold ${tones[tone]}`}>{value}</p>
      {hint && <p className="text-xs text-[var(--c-text-muted)] mt-0.5">{hint}</p>}
    </div>
  );
}