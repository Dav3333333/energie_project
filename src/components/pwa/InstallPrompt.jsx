import { usePwaInstall } from '@/hooks/usePwaInstall';

export default function InstallPrompt() {
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  if (isInstalled || !canInstall) return null;

  return (
    <button
      type="button"
      onClick={promptInstall}
      className="fixed bottom-20 right-4 z-40 rounded-full bg-brand-600 text-white px-4 py-3 shadow-lg min-h-touch"
    >
      Installer l&apos;application
    </button>
  );
}