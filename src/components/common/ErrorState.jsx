import { AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function ErrorState({ message = 'Une erreur est survenue.', onRetry }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-10">
      <AlertCircle size={32} className="text-danger" />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}