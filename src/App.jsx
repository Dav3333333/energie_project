import { BrowserRouter } from 'react-router-dom';
import AppProviders from '@/app/providers/AppProviders';
import AppRouter from '@/app/router/AppRouter';
import InstallPrompt from '@/components/pwa/InstallPrompt';

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <InstallPrompt />
        <AppRouter />
      </AppProviders>
    </BrowserRouter>
  );
}
