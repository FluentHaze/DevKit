import type { ButtonHTMLAttributes, ReactNode } from 'react';
export function Button({
  children,
  primary = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; children: ReactNode }) {
  return (
    <button
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${primary ? 'border-accent-solid bg-accent-solid text-on-accent hover:brightness-110' : 'border-border bg-surface text-primary hover:bg-muted'} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export const controlClass =
  'min-h-9 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15';
export type Translate = (key: string) => string;
