export default function PageHeader({ title, subtitle, actions = null }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[var(--c-text-muted)] truncate">{subtitle}</p>
        )}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}