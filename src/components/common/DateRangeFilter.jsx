export default function DateRangeFilter({ from, to, onChange }) {
  return (
    <div className="flex gap-2">
      <label className="flex-1">
        <span className="text-xs text-[var(--c-text-muted)] block mb-1">Du</span>
        <input
          type="date"
          value={from ?? ''}
          onChange={(e) => onChange({ from: e.target.value, to })}
          className="w-full min-h-touch px-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] text-sm"
        />
      </label>
      <label className="flex-1">
        <span className="text-xs text-[var(--c-text-muted)] block mb-1">Au</span>
        <input
          type="date"
          value={to ?? ''}
          onChange={(e) => onChange({ from, to: e.target.value })}
          className="w-full min-h-touch px-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] text-sm"
        />
      </label>
    </div>
  );
}