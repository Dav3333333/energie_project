import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-50 text-amber-900 border-b border-amber-200"
    >
      <WifiOff size={16} />
      <span>Hors ligne — les données affichées peuvent ne pas être synchronisées.</span>
    </div>
  );
}