'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, LayoutGrid, FileText, Users, MessageSquare, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

type SearchResultType = 'project' | 'task' | 'document' | 'person' | 'memory';

interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  meta?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

const SECTION_ORDER: Array<{ type: SearchResultType; label: string; icon: typeof Search }> = [
  { type: 'project', label: 'Projects', icon: LayoutGrid },
  { type: 'task', label: 'Tasks', icon: CheckSquare },
  { type: 'document', label: 'Docs', icon: FileText },
  { type: 'person', label: 'People', icon: Users },
  { type: 'memory', label: 'Memory', icon: MessageSquare },
];

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatches(text: string, tokens: string[]) {
  if (!text) return null;
  if (tokens.length === 0) return text;

  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern).filter((part) => part.length > 0);

  return parts.map((part, index) => {
    const isMatch = tokens.some((token) => token.toLowerCase() === part.toLowerCase());
    if (!isMatch) return <span key={index}>{part}</span>;
    return (
      <span
        key={index}
        className="rounded bg-[var(--accent-primary)]/30 px-1 text-[var(--text-primary)]"
      >
        {part}
      </span>
    );
  });
}

export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<HTMLButtonElement[]>([]);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const tokens = useMemo(() => tokenize(query), [query]);

  const groupedResults = useMemo(() => {
    const grouped: Record<SearchResultType, SearchResultItem[]> = {
      project: [],
      task: [],
      document: [],
      person: [],
      memory: [],
    };

    results.forEach((result) => {
      grouped[result.type].push(result);
    });

    return grouped;
  }, [results]);

  const flatResults = useMemo(() => {
    return SECTION_ORDER.flatMap((section) => groupedResults[section.type]);
  }, [groupedResults]);

  const indexMap = useMemo(() => {
    const map = new Map<string, number>();
    flatResults.forEach((item, index) => {
      map.set(`${item.type}:${item.id}`, index);
    });
    return map;
  }, [flatResults]);

  useEffect(() => {
    itemRefs.current = [];
    if (flatResults.length > 0) {
      setActiveIndex(0);
    } else {
      setActiveIndex(-1);
    }
  }, [flatResults.length]);

  useEffect(() => {
    if (activeIndex < 0) return;
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  useEffect(() => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setError(null);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Failed to search');
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('We could not load the results.');
        }
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isOpen, query]);


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = useCallback((result: SearchResultItem) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    router.push(result.href);
  }, [router]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';

      if (isCmdK) {
        event.preventDefault();
        setIsOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }

      if (!isOpen) return;

      if (event.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => {
          if (flatResults.length === 0) return -1;
          return prev < 0 ? 0 : (prev + 1) % flatResults.length;
        });
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => {
          if (flatResults.length === 0) return -1;
          return prev <= 0 ? flatResults.length - 1 : prev - 1;
        });
      }

      if (event.key === 'Enter' && activeIndex >= 0 && flatResults[activeIndex]) {
        event.preventDefault();
        handleSelect(flatResults[activeIndex]);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, flatResults, handleSelect, isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center gap-2 rounded-lg border border-[var(--border-default)]',
          'bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-secondary)]',
          'hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors',
          isOpen && 'border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
        )}
        aria-label="Open search"
      >
        <Search size={16} />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden md:inline-flex items-center rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
          ⌘K
        </kbd>
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 w-[min(92vw,640px)] overflow-hidden',
            'rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]',
            'shadow-[var(--shadow-lg)] z-50'
          )}
        >
          <div className="border-b border-[var(--border-default)] p-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                placeholder="Search projects, docs, people, tasks, memory…"
                className={cn(
                  'w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)]',
                  'py-2.5 pl-9 pr-24 text-sm text-[var(--text-primary)]',
                  'placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]',
                  'focus:ring-1 focus:ring-[var(--accent-primary)]'
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <kbd className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                  Esc
                </kbd>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {SECTION_ORDER.map((section) => (
                <span key={section.type} className="rounded-full border border-[var(--border-default)] px-2 py-1">
                  {section.label}
                </span>
              ))}
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {isLoading && (
              <div className="px-4 py-6 text-sm text-[var(--text-muted)]">
                Searching across the site...
              </div>
            )}

            {!isLoading && error && (
              <div className="px-4 py-6 text-sm text-[var(--accent-danger)]">{error}</div>
            )}

            {!isLoading && !error && query.trim().length === 0 && (
              <div className="px-4 py-6 text-sm text-[var(--text-muted)]">
                Start typing to search anything in the workspace.
              </div>
            )}

            {!isLoading && !error && query.trim().length > 0 && results.length === 0 && (
              <div className="px-4 py-6 text-sm text-[var(--text-muted)]">
                No results for "{query}".
              </div>
            )}

            {!isLoading && !error && results.length > 0 && (
              <div className="divide-y divide-[var(--border-default)]">
                {SECTION_ORDER.map((section) => {
                  const sectionResults = groupedResults[section.type];
                  if (sectionResults.length === 0) return null;

                  const Icon = section.icon;

                  return (
                    <div key={section.type}>
                      <div className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        <Icon size={12} />
                        {section.label}
                      </div>
                      <div>
                        {sectionResults.map((result) => {
                          const index = indexMap.get(`${result.type}:${result.id}`) ?? -1;
                          const isActive = index === activeIndex;

                          return (
                            <button
                              key={`${result.type}-${result.id}`}
                              ref={(el) => {
                                if (el && index >= 0) itemRefs.current[index] = el;
                              }}
                              type="button"
                              onClick={() => handleSelect(result)}
                              className={cn(
                                'w-full px-4 py-3 text-left transition-colors',
                                isActive
                                  ? 'bg-[var(--bg-elevated)]'
                                  : 'hover:bg-[var(--bg-elevated)]'
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                                  <Icon size={16} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                                      {highlightMatches(result.title, tokens)}
                                    </p>
                                    {result.priority && (
                                      <Badge variant="priority" priority={result.priority}>
                                        {result.priority}
                                      </Badge>
                                    )}
                                  </div>
                                  {result.subtitle && (
                                    <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">
                                      {highlightMatches(result.subtitle, tokens)}
                                    </p>
                                  )}
                                  {result.meta && (
                                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                      {result.meta}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
