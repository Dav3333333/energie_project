import { ShieldAlert } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';

export default function AccessDenied({ message = 'Accès refusé.' }) {
  return (
    <AppShell title="Accès refusé">
      <div className="flex flex-col items-center text-center gap-3 py-16">
        <ShieldAlert size={40} className="text-danger" />
        <p className="font-medium">{message}</p>
      </div>
    </AppShell>
  );
}