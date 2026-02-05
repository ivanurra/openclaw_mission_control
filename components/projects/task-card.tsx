'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Badge, Avatar } from '@/components/ui';
import type { Task, Developer } from '@/types';

interface TaskCardProps {
  task: Task;
  developer?: Developer;
  isDragging?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TaskCard({ task, developer, isDragging, onEdit, onDelete }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function handleOpen() {
    if (isDragging || isSortableDragging) return;
    onEdit?.();
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      role={onEdit ? 'button' : undefined}
      tabIndex={onEdit ? 0 : undefined}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (!onEdit) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      }}
      className={cn(
        'group relative p-3 rounded-lg',
        'bg-[var(--bg-tertiary)] border border-[var(--border-default)]',
        'hover:border-[var(--border-strong)] transition-all',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg',
        onEdit && 'cursor-pointer'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        onClick={(event) => event.stopPropagation()}
        className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>

      {/* Menu button */}
      {(onEdit || onDelete) && (
        <div className="absolute right-2 top-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              setShowMenu(!showMenu);
            }}
            aria-label="Task actions"
            className="p-1 rounded opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all"
          >
            <MoreHorizontal size={14} />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div
                className="absolute right-0 top-full mt-1 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-lg z-20 min-w-[120px]"
                onClick={(event) => event.stopPropagation()}
              >
                {onEdit && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowMenu(false);
                      onEdit?.();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[var(--accent-danger)] hover:bg-[var(--bg-hover)]"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="pl-4">
        <h4 className="font-medium text-sm text-[var(--text-primary)] mb-2 pr-6">
          {task.title}
        </h4>

        {task.description && (
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">
            {task.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <Badge variant="priority" priority={task.priority}>
            {task.priority}
          </Badge>

          {developer && (
            <Avatar name={developer.name} color={developer.color} size="sm" />
          )}
        </div>
      </div>
    </div>
  );
}
