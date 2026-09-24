export default function LoadingState({ fullScreen = false, label = 'Chargement…' }) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3 text-[var(--c-text-muted)]',
        fullScreen ? 'min-h-dvh' : 'py-10',
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      <span className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}