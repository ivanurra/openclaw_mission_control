'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--text-secondary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg px-3 py-2',
            'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
            'border border-[var(--border-default)]',
            'placeholder:text-[var(--text-muted)]',
            'focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]',
            'transition-colors',
            error && 'border-[var(--accent-danger)] focus:border-[var(--accent-danger)] focus:ring-[var(--accent-danger)]',
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-sm text-[var(--accent-danger)]">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
