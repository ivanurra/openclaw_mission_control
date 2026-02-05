'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { Task } from '@/types';
import { KANBAN_COLUMNS } from '@/lib/constants/kanban';
import { cn } from '@/lib/utils/cn';

const statusLabels = new Map(KANBAN_COLUMNS.map((column) => [column.id, column.label]));

function isTypingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}

export function TaskSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const projectId = useMemo(() => {
    const match = pathname.match(/^\/projects\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery('');
    setIsOpen(false);
    setTasks([]);
    setError(null);
  }, [projectId]);

  useEffect(() => {
    if (!isOpen || !projectId) return;

    let isActive = true;
    async function loadTasks() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/projects/${projectId}/tasks`);
        if (!res.ok) throw new Error('Failed to load tasks');
        const data = await res.json();
        if (isActive) setTasks(data);
      } catch (err) {
        if (isActive) setError('No se pudieron cargar las tareas.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadTasks();
    return () => {
      isActive = false;
    };
  }, [isOpen, projectId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === '/' && !isTypingInField(event.target)) {
        if (!projectId) return;
        event.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }

      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [projectId]);

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

  const filteredResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return tasks.filter((task) => {
      const haystack = `${task.title} ${task.description || ''}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query, tasks]);

  function handleSelect(task: Task) {
    if (!projectId) return;
    setIsOpen(false);
    setQuery('');
    router.push(`/projects/${projectId}?task=${task.id}`);
  }

  const isDisabled = !projectId;

  return (
    <div ref={containerRef} className="relative hidden md:flex items-center">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (!isDisabled) setIsOpen(true);
        }}
        placeholder={isDisabled ? 'Search tasks (open a project)' : 'Search tasks...'}
        disabled={isDisabled}
        className={cn(
          'w-64 pl-9 pr-12 py-1.5 rounded-lg text-sm',
          'bg-[var(--bg-tertiary)] border border-[var(--border-default)]',
          'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
          'focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]',
          'transition-colors',
          isDisabled && 'opacity-60 cursor-not-allowed'
        )}
        aria-label="Search tasks"
        title={isDisabled ? 'Open a project to search tasks' : 'Search tasks in this project'}
      />
      <kbd className="absolute right-3 px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-xs text-[var(--text-muted)]">
        /
      </kbd>

      {isOpen && !isDisabled && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[90vw] rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-lg overflow-hidden z-50">
          <div className="px-3 py-2 text-xs text-[var(--text-muted)] border-b border-[var(--border-default)]">
            Busca por título o descripción
          </div>
          <div className="max-h-80 overflow-auto">
            {isLoading && (
              <div className="px-3 py-3 text-sm text-[var(--text-muted)]">
                Cargando tareas...
              </div>
            )}
            {!isLoading && error && (
              <div className="px-3 py-3 text-sm text-[var(--accent-danger)]">
                {error}
              </div>
            )}
            {!isLoading && !error && query.trim().length === 0 && (
              <div className="px-3 py-3 text-sm text-[var(--text-muted)]">
                Empieza a escribir para buscar tareas.
              </div>
            )}
            {!isLoading && !error && query.trim().length > 0 && filteredResults.length === 0 && (
              <div className="px-3 py-3 text-sm text-[var(--text-muted)]">
                No hay resultados para "{query}".
              </div>
            )}
            {!isLoading && !error && filteredResults.length > 0 && (
              <div className="divide-y divide-[var(--border-default)]">
                {filteredResults.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => handleSelect(task)}
                    className="w-full text-left px-3 py-3 hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[var(--text-muted)]">
                            {statusLabels.get(task.status) ?? task.status}
                          </span>
                          <Badge variant="priority" priority={task.priority}>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
