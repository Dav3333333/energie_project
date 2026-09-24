import { ChevronLeft, Menu } from 'lucide-react';

export default function TopBar({
  title = 'Galerie Énergie Manager',
  showBack = false,
  onBack,
  actions = null,
  onMenuClick,
}) {
  return (
    <header
      className="fixed top-0 inset-x-0 z-30 bg-[var(--c-surface)]/95 backdrop-blur border-b border-[var(--c-border)] safe-top"
      style={{ height: 'calc(var(--topbar-h) + var(--sat))' }}
    >
      <div className="h-[var(--topbar-h)] flex items-center gap-2 px-3 safe-x">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour"
            className="min-w-touch min-h-touch flex items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-700"
          >
            <ChevronLeft size={24} />
          </button>
        ) : onMenuClick ? (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Ouvrir le menu"
            className="min-w-touch min-h-touch flex items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-700"
          >
            <Menu size={24} />
          </button>
        ) : (
          <span className="w-touch" aria-hidden />
        )}

        <h1 className="flex-1 text-base font-semibold truncate text-center">
          {title}
        </h1>

        <div className="min-w-touch flex items-center justify-end gap-1">
          {actions}
        </div>
      </div>
    </header>
  );
}