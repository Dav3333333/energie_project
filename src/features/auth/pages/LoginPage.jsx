import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Mail, Lock, LogIn, Zap } from 'lucide-react';
import { loginSchema } from '../schemas/authSchemas';
import { signInWithIdentifier, mapAuthError } from '../services/authService';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await signInWithIdentifier(values.identifier, values.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--c-bg)] safe-x">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <header className="text-center mb-8">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center mb-4">
              <Zap className="text-white" size={32} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold">Galerie Énergie Manager</h1>
            <p className="text-sm text-[var(--c-text-muted)] mt-1">
              Connectez-vous pour continuer
            </p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Email ou nom d'utilisateur"
              autoComplete="username"
              inputMode="email"
              enterKeyHint="next"
              leadingIcon={<Mail size={18} />}
              error={errors.identifier?.message}
              {...register('identifier')}
            />
            <Input
              label="Mot de passe"
              type="password"
              autoComplete="current-password"
              enterKeyHint="done"
              leadingIcon={<Lock size={18} />}
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-brand-600 underline-offset-4 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <Button type="submit" size="lg" loading={submitting}>
              <LogIn size={18} />
              Se connecter
            </Button>
          </form>

          <p className="mt-8 text-xs text-center text-[var(--c-text-muted)]">
            Aucune inscription publique. Contactez un administrateur pour obtenir un compte.
          </p>
        </div>
      </div>
    </div>
  );
}