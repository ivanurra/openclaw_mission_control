'use client';

import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Logo } from './logo';
import { TaskSearch } from './task-search';
import { GlobalSearch } from './global-search';
import { MadridClock } from './madrid-clock';
import { useSidebar } from './sidebar-context';

export function Navbar() {
  const pathname = usePathname();
  const { open, toggle } = useSidebar();
  const showTaskSearch = /^\/projects\/[^/]+/.test(pathname);
  const gatewayStatus: 'online' | 'disconnected' = 'online';
  const isGatewayOnline = gatewayStatus === 'online';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Sidebar toggle */}
        <button
          onClick={toggle}
          aria-label={open ? 'Close sidebar' : 'Open sidebar'}
          className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          {open ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>

        {/* Logo */}
        <Logo size="sm" />

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
