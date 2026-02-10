'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, FileText, Users, MessageSquare, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Logo } from './logo';
import { TaskSearch } from './task-search';
import { GlobalSearch } from './global-search';
import { MadridClock } from './madrid-clock';

const navItems = [
  { label: 'Projects', href: '/projects', icon: LayoutGrid },
  { label: 'Scheduled', href: '/scheduled', icon: CalendarClock },
  { label: 'Docs', href: '/docs', icon: FileText },
  { label: 'Crew', href: '/people', icon: Users },
  { label: 'Memory', href: '/memory', icon: MessageSquare },
];

export function Navbar() {
  const pathname = usePathname();
  const showTaskSearch = /^\/projects\/[^/]+/.test(pathname);
  const gatewayStatus: 'online' | 'disconnected' = 'online';
  const isGatewayOnline = gatewayStatus === 'online';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Logo */}
        <Logo size="sm" />

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1 ml-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                )}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2">
          <MadridClock />
          <div
            aria-live="polite"
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em]',
              isGatewayOnline
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/45 bg-rose-500/10 text-rose-300'
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isGatewayOnline ? 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-rose-400'
              )}
            />
            {isGatewayOnline ? 'ONLINE' : 'DISCONNECTED'}
          </div>
        </div>
        <GlobalSearch />
        {showTaskSearch && <TaskSearch />}
      </div>
    </header>
  );
}
