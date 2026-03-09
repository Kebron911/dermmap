import clsx from 'clsx';

interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, name, error, required, children }: FormFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="label">
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert" id={`${name}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <input
      className={clsx(
        'input',
        error && 'border-red-300 focus:border-red-500 focus:ring-red-200',
        className,
      )}
      aria-invalid={!!error}
      aria-describedby={error ? `${props.name}-error` : undefined}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export function Select({ error, className, children, ...props }: SelectProps) {
  return (
    <select
      className={clsx(
        'input',
        error && 'border-red-300 focus:border-red-500 focus:ring-red-200',
        className,
      )}
      aria-invalid={!!error}
      aria-describedby={error ? `${props.name}-error` : undefined}
      {...props}
    >
      {children}
    </select>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export function Textarea({ error, className, ...props }: TextareaProps) {
  return (
    <textarea
      className={clsx(
        'input min-h-[100px]',
        error && 'border-red-300 focus:border-red-500 focus:ring-red-200',
        className,
      )}
      aria-invalid={!!error}
      aria-describedby={error ? `${props.name}-error` : undefined}
      {...props}
    />
  );
}
