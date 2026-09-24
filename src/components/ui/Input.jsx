import { forwardRef, useId } from 'react';

const Input = forwardRef(function Input(
  { label, error, hint, leadingIcon = null, className = '', id, type = 'text', ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? `input-${autoId}`;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-muted)]">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={[
            'w-full min-h-touch px-3 rounded-xl bg-[var(--c-surface)] border transition-colors',
            leadingIcon ? 'pl-10' : '',
            error ? 'border-danger focus:border-danger' : 'border-[var(--c-border)] focus:border-brand-500',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          ].join(' ')}
          aria-invalid={!!error}
          {...rest}
        />
      </div>
      {hint && !error && <p className="mt-1 text-xs text-[var(--c-text-muted)]">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
});


export default Input;