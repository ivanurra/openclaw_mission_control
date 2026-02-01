'use client';

import { cn } from '@/lib/utils/cn';
import type { TaskPriority } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'priority';
  priority?: TaskPriority;
  className?: string;
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-[var(--priority-low)]/20 text-[var(--priority-low)]',
  medium: 'bg-[var(--priority-medium)]/20 text-[var(--priority-medium)]',
  high: 'bg-[var(--priority-high)]/20 text-[var(--priority-high)]',
  urgent: 'bg-[var(--priority-urgent)]/20 text-[var(--priority-urgent)]',
};

export function Badge({ children, variant = 'default', priority, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variant === 'default' && 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
        variant === 'priority' && priority && priorityColors[priority],
        className
      )}
    >
      {children}
    </span>
  );
}
