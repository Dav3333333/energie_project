import { Search, X } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = 'Rechercher…' }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-muted)]">
        <Search size={18} />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-touch pl-10 pr-10 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 min-w-touch min-h-touch flex items-center justify-center"
          aria-label="Effacer"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}