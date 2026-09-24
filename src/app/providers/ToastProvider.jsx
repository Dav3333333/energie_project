import { Toaster } from 'sonner';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      toastOptions={{ duration: 4000 }}
    />
  );
}