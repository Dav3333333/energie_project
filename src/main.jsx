import React from 'react';
import ReactDOM from 'react-dom/client';
import { toast } from 'sonner';
import App from './App.jsx';
import { initServiceWorker } from '@/lib/pwa/registerSW';
import './styles/index.css';

const { updateSW } = initServiceWorker({
  onNeedRefresh() {
    toast('Nouvelle version disponible', {
      action: { label: 'Recharger', onClick: () => updateSW() },
      duration: 8000,
    });
  },
  onOfflineReady() {
    toast.success("Application prête pour l'usage hors ligne.");
  },
  onError(error) {
    // On journalise sans bloquer le démarrage.
    console.warn('[PWA] Service Worker indisponible :', error?.message);
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);