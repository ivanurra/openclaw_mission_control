'use client';

import { cn } from '@/lib/utils/cn';

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'w-64 flex-shrink-0 border-r border-[var(--border-default)]',
        'bg-[var(--bg-secondary)] overflow-y-auto',
        'hidden lg:block',
        className
      )}
    >
      {children}
    </aside>
  );
}

interface SidebarSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function SidebarSection({ title, children, className }: SidebarSectionProps) {
  return (
    <div className={cn('p-4', className)}>
      {title && (
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
