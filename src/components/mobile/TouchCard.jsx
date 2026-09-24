import { ChevronRight } from 'lucide-react';

export default function TouchCard({
  title,
  subtitle,
  leading = null,
  trailing = null,
  onClick,
  interactive = false,
  className = '',
}) {
  const Comp = interactive ? 'button' : 'div';
  return (
    <Comp
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      className={[
        'w-full text-left flex items-center gap-3 p-4 rounded-xl',
        'bg-[var(--c-surface)] border border-[var(--c-border)] shadow-card',
        interactive && 'tap-scale active:bg-slate-50 dark:active:bg-slate-800',
        className,
      ].join(' ')}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        {subtitle && (
          <p className="text-sm text-[var(--c-text-muted)] truncate">{subtitle}</p>
        )}
      </div>
      {trailing ?? (interactive && <ChevronRight size={20} className="text-[var(--c-text-muted)]" />)}
    </Comp>
  );
}