'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  FileText,
  Users,
  MessageSquare,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useSidebar } from './sidebar-context';

const navItems = [
  { label: 'Projects', href: '/projects', icon: LayoutGrid },
  { label: 'Scheduled', href: '/scheduled', icon: CalendarClock },
  { label: 'Docs', href: '/docs', icon: FileText },
  { label: 'Crew', href: '/people', icon: Users },
  { label: 'Memory', href: '/memory', icon: MessageSquare },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { open } = useSidebar();

  return (
    <aside
      data-testid="app-sidebar"
      className={cn(
        'flex flex-col border-r border-[var(--border-default)] bg-[var(--bg-secondary)] transition-all duration-200 overflow-hidden',
        open ? 'w-52' : 'w-0 border-r-0'
      )}
    >
      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 px-2 pt-3 min-w-[208px]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-l-3 border-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              )}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
