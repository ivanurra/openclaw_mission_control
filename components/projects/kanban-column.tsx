'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { TaskStatus } from '@/types';

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  count: number;
  children: React.ReactNode;
  onAddTask: () => void;
}

export function KanbanColumn({ id, title, count, children, onAddTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-72 flex-shrink-0 flex flex-col rounded-xl',
        'bg-[var(--bg-secondary)] border border-[var(--border-default)]',
        isOver && 'ring-2 ring-[var(--accent-primary)] ring-opacity-50'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-[var(--text-primary)]">{title}</h3>
          <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--bg-elevated)] text-[var(--text-muted)]">
            {count}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]">
        {children}
        {count === 0 && (
          <button
            onClick={onAddTask}
            className="w-full p-3 rounded-lg border border-dashed border-[var(--border-default)] text-[var(--text-muted)] text-sm hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] transition-colors"
          >
            + Add a task
          </button>
        )}
      </div>
    </div>
  );
}
