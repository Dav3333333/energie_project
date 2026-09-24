import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, Send } from 'lucide-react';
import { forgotPasswordSchema } from '../schemas/authSchemas';
import { sendResetEmail, mapAuthError } from '../services/authService';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await sendResetEmail(values.identifier);
      setSent(true);
    } catch (err) {
      // Message volontairement générique : ne pas révéler l'existence du compte.
      toast.error(mapAuthError(err) || 'Envoi impossible.');
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--c-bg)] safe-x">
      <header className="h-14 flex items-center px-2">
        <Link to="/login" className="min-w-touch min-h-touch flex items-center justify-center">
          <ArrowLeft size={22} />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold mb-1">Réinitialiser le mot de passe</h1>
          <p className="text-sm text-[var(--c-text-muted)] mb-6">
            Saisissez votre email ou votre nom d&apos;utilisateur.
          </p>

          {sent ? (
            <div className="p-4 rounded-xl bg-success-light text-success-dark text-sm">
              Si un compte correspond, un email de réinitialisation a été envoyé.
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Input
                label="Email ou nom d'utilisateur"
                autoComplete="username"
                enterKeyHint="send"
                error={errors.identifier?.message}
                {...register('identifier')}
              />
              <Button type="submit" size="lg" loading={submitting}>
                <Send size={18} />
                Envoyer le lien
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}