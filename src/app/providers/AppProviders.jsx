import AuthProvider from './AuthProvider';
import QueryProvider from './QueryProvider';
import ToastProvider from './ToastProvider';

export default function AppProviders({ children }) {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
        <ToastProvider />
      </AuthProvider>
    </QueryProvider>
  );
}