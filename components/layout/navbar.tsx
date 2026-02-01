'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, FileText, Users, MessageSquare, Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Logo } from './logo';

const navItems = [
  { label: 'Projects', href: '/projects', icon: LayoutGrid },
  { label: 'Docs', href: '/docs', icon: FileText },
  { label: 'People', href: '/people', icon: Users },
  { label: 'Memory', href: '/memory', icon: MessageSquare },
];

export function Navbar() {
  const pathname = usePathname();

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

        {/* Search placeholder */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-muted)]">
          <Search size={16} />
          <span className="text-sm">Search...</span>
          <kbd className="ml-2 px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-xs">
            /
          </kbd>
        </div>
      </div>
    </header>
  );
}
