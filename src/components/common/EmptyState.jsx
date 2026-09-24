export default function EmptyState({ icon = null, title, description, action = null }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-10">
      {icon && <div className="text-[var(--c-text-muted)]">{icon}</div>}
      <p className="font-medium">{title}</p>
      {description && (
        <p className="text-sm text-[var(--c-text-muted)] max-w-xs">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}