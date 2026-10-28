import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

import { controlClass } from './ui';

export function Select({
  className = '',
  wrapperClassName = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }) {
  return (
    <span className={`relative block min-w-0 ${wrapperClassName}`}>
      <select className={`${controlClass} appearance-none pe-10 ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={16}
        className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-secondary"
      />
    </span>
  );
}
