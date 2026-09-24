import { forwardRef } from 'react';

const VARIANTS = {
  primary: 'bg-brand-600 text-white active:bg-brand-700 disabled:bg-brand-300',
  secondary: 'bg-slate-100 dark:bg-slate-800 text-[var(--c-text)] active:bg-slate-200',
  danger: 'bg-danger text-white active:bg-red-700',
  ghost: 'bg-transparent text-[var(--c-text)] active:bg-slate-100 dark:active:bg-slate-800',
  outline:
    'bg-transparent border border-[var(--c-border)] text-[var(--c-text)] active:bg-slate-100',
};

const SIZES = {
  sm: 'min-h-touch px-3 text-sm rounded-lg',
  md: 'min-h-touch px-4 text-base rounded-xl',
  lg: 'min-h-touch-lg px-5 text-base rounded-xl w-full',
};

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    type = 'button',
    loading = false,
    disabled = false,
    className = '',
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium',
        'transition-transform tap-scale',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading && (
        <span
          className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
});

export default Button;