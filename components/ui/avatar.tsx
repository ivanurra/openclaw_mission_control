'use client';

import { cn } from '@/lib/utils/cn';

interface AvatarProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, color = '#6366f1', size = 'md', className }: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium text-white',
        {
          'w-6 h-6 text-xs': size === 'sm',
          'w-8 h-8 text-sm': size === 'md',
          'w-10 h-10 text-base': size === 'lg',
        },
        className
      )}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </div>
  );
}
