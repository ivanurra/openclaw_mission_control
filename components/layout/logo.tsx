'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface LogoProps {
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ showText = true, size = 'md', className }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 40, text: 'text-2xl' },
  };

  const { icon, text } = sizes[size];

  return (
    <Link
      href="/projects"
      className={cn('flex items-center gap-2 hover:opacity-90 transition-opacity', className)}
    >
      {/* Minimalist Endurance-inspired icon */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-[var(--accent-primary)]"
      >
        <path
          d="M6 34H16L24 10L30 24H40L30 34H6Z"
          fill="currentColor"
        />
      </svg>

      {showText && (
        <span className={cn('font-bold text-[var(--text-primary)]', text)}>
          Endur
        </span>
      )}
    </Link>
  );
}
