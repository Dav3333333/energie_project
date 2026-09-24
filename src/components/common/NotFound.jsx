import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-3 p-6 text-center safe-x">
      <p className="text-3xl font-bold">404</p>
      <p className="text-sm text-[var(--c-text-muted)]">Page introuvable.</p>
      <Link to="/dashboard" className="text-brand-600 font-medium underline">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}