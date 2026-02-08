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
    sm: { icon: 26, text: 'text-[1.2rem]' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 40, text: 'text-2xl' },
  };

  const { icon, text } = sizes[size];

  return (
    <Link
      href="/projects"
      className={cn('flex items-center gap-2 hover:opacity-90 transition-opacity', className)}
    >
      {/* Mission Control mark: clean orbital target motif */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-[var(--accent-primary)] drop-shadow-[0_0_10px_rgba(99,102,241,0.35)]"
      >
        <rect
          x="4"
          y="4"
          width="40"
          height="40"
          rx="12"
          fill="currentColor"
          fillOpacity="0.12"
          stroke="currentColor"
          strokeOpacity="0.45"
        />
        <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="1.8" />
        <path d="M24 12V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M24 28V36" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 24H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M28 24H36" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="24" cy="24" r="3.5" fill="currentColor" />
        <circle
          cx="32.5"
          cy="15.5"
          r="1.6"
          fill="currentColor"
          fillOpacity="0.9"
        />
      </svg>

      {showText && (
        <span className={cn('font-bold tracking-[0.02em] text-[var(--text-primary)]', text)}>
          Mission Control
        </span>
      )}
    </Link>
  );
}
