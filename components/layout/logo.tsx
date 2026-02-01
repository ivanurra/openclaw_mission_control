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
      {/* Minimalist ship icon */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-[var(--accent-primary)]"
      >
        {/* Hull */}
        <path
          d="M8 36C8 36 12 40 24 40C36 40 40 36 40 36L38 32H10L8 36Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Main sail */}
        <path
          d="M24 8V32"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M24 10L36 28H24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Secondary sail */}
        <path
          d="M24 14L14 26H24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Flag */}
        <path
          d="M24 8L28 10L24 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
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
