'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Plus, Zap, CalendarClock, Calendar, Trash2 } from 'lucide-react';
import { addDays, format, formatDistanceToNowStrict, getDay, startOfDay, startOfWeek } from 'date-fns';
import { Button, Modal, Input, Textarea, Select, EmptyState } from '@/components/ui';
import type { CreateScheduledTaskInput, DayOfWeek, Member, ScheduledTask } from '@/types';
import { cn } from '@/lib/utils/cn';

const WEEK_DAYS: Array<{ key: DayOfWeek; short: string; label: string }> = [
  { key: 'monday', short: 'Mon', label: 'Monday' },
  { key: 'tuesday', short: 'Tue', label: 'Tuesday' },
  { key: 'wednesday', short: 'Wed', label: 'Wednesday' },
  { key: 'thursday', short: 'Thu', label: 'Thursday' },
  { key: 'friday', short: 'Fri', label: 'Friday' },
  { key: 'saturday', short: 'Sat', label: 'Saturday' },
  { key: 'sunday', short: 'Sun', label: 'Sunday' },
];

const COLOR_OPTIONS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#ef4444',
];

const ALWAYS_RUNNING = [
  {
    title: 'mission control check',
    interval: 'Every 30 min',
    color: '#60a5fa',
  },
];

type ViewMode = 'week' | 'today';

function getDayKeyFromDate(date: Date): DayOfWeek {
  const index = (getDay(date) + 6) % 7;
  return WEEK_DAYS[index].key;
}

function getNextOccurrence(task: ScheduledTask, baseDate: Date): Date {
  const [hour, minute] = task.time.split(':').map((value) => Number(value));
  const baseDayIndex = (getDay(baseDate) + 6) % 7;
  const targetIndex = WEEK_DAYS.findIndex((day) => day.key === task.dayOfWeek);
  let diff = targetIndex - baseDayIndex;
  if (diff < 0) diff += 7;

  let candidate = addDays(startOfDay(baseDate), diff);
  candidate = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate(), hour, minute);

  if (diff === 0 && candidate <= baseDate) {
    candidate = addDays(candidate, 7);
  }

  return candidate;
}

export default function ScheduledPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<ScheduledTask | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const todayColumnRef = useRef<HTMLDivElement | null>(null);

  const [formData, setFormData] = useState<CreateScheduledTaskInput>({
    title: '',
    description: '',
    time: '09:00',
    dayOfWeek: 'monday',
    color: COLOR_OPTIONS[0],
    assignedMemberId: '',
  });

  const currentWeek = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return WEEK_DAYS.map((day, index) => ({
      ...day,
      date: addDays(start, index),
    }));
  }, []);
  const todayKey = getDayKeyFromDate(new Date());

  const visibleDays = useMemo(() => {
    if (viewMode === 'today') {
      return currentWeek.filter((day) => day.key === todayKey);
    }

    return currentWeek;
  }, [currentWeek, todayKey, viewMode]);

  const tasksByDay = useMemo(() => {
    const map: Record<DayOfWeek, ScheduledTask[]> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };

    tasks.forEach((task) => {
      map[task.dayOfWeek].push(task);
    });

    WEEK_DAYS.forEach((day) => {
      map[day.key].sort((a, b) => a.time.localeCompare(b.time));
    });

    return map;
  }, [tasks]);

  const nextUp = useMemo(() => {
    const now = new Date();
    return tasks
      .map((task) => ({
        task,
        next: getNextOccurrence(task, now),
      }))
      .sort((a, b) => a.next.getTime() - b.next.getTime())
      .slice(0, 6);
  }, [tasks]);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/scheduled');
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch scheduled tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchMembers();
  }, [fetchTasks]);

  async function fetchMembers() {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      setMembers(data);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  }

  const memberOptions = useMemo(() => [
    { value: '', label: 'Unassigned' },
    ...members.map((m) => ({ value: m.id, label: m.name })),
  ], [members]);

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      time: '09:00',
      dayOfWeek: 'monday',
      color: COLOR_OPTIONS[0],
      assignedMemberId: '',
    });
  }

  function openCreateTaskModal() {
    setEditingTask(null);
    resetForm();
    setIsModalOpen(true);
  }

  function openEditTaskModal(task: ScheduledTask) {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      time: task.time,
      dayOfWeek: task.dayOfWeek,
      color: task.color,
      assignedMemberId: task.assignedMemberId || '',
    });
    setIsModalOpen(true);
  }

  function closeTaskModal() {
    setIsModalOpen(false);
    setEditingTask(null);
    resetForm();
  }

  async function handleSaveTask(event: React.FormEvent) {
    event.preventDefault();
    if (!formData.title.trim()) return;

    const payload = {
      ...formData,
      assignedMemberId: formData.assignedMemberId || undefined,
    };

    setIsSaving(true);
    try {
      if (editingTask) {
        const res = await fetch(`/api/scheduled/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update scheduled task');
        const updated = await res.json();
        setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
      } else {
        const res = await fetch('/api/scheduled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create scheduled task');
        const created = await res.json();
        setTasks((prev) => [...prev, created]);
      }

      closeTaskModal();
    } catch (error) {
      console.error('Failed to save scheduled task:', error);
    } finally {
      setIsSaving(false);
    }
  }

  function handleOpenDeleteTask() {
    if (!editingTask) return;
    setTaskToDelete(editingTask);
    setIsModalOpen(false);
    setIsDeleteModalOpen(true);
  }

  async function confirmDeleteTask() {
    if (!taskToDelete) return;

    setIsDeletingTask(true);
    try {
      const res = await fetch(`/api/scheduled/${taskToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete scheduled task');
      setTasks((prev) => prev.filter((task) => task.id !== taskToDelete.id));
      setTaskToDelete(null);
      setIsDeleteModalOpen(false);
      setEditingTask(null);
      resetForm();
    } catch (error) {
      console.error('Failed to delete scheduled task:', error);
    } finally {
      setIsDeletingTask(false);
    }
  }

  function scrollToToday() {
    todayColumnRef.current?.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  function handleTodayView() {
    setViewMode('today');
    scrollToToday();
  }

  async function handleRefresh() {
    await fetchTasks();
  }

  function getAssigneeName(memberId?: string): string | null {
    if (!memberId) return null;
    const member = members.find((m) => m.id === memberId);
    return member?.name || null;
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Scheduled Tasks</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Automated routines and recurring focus blocks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              aria-pressed={viewMode === 'week'}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-full transition-colors',
                viewMode === 'week'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              Week
            </button>
            <button
              type="button"
              onClick={handleTodayView}
              aria-pressed={viewMode === 'today'}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-full transition-colors',
                viewMode === 'today'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              Today
            </button>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
            aria-label="Refresh scheduled data"
          >
            <RefreshCw size={16} className={cn(isLoading && 'animate-spin')} />
          </button>
          <Button onClick={openCreateTaskModal}>
            <Plus size={18} />
            Add Task
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-semibold text-[var(--text-primary)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
            <Zap size={16} className="text-[var(--accent-primary)]" />
          </div>
          Always Running
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {ALWAYS_RUNNING.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm"
              style={{ color: item.color }}
            >
              <span className="font-medium">{item.title}</span>
              <span className="text-xs text-[var(--text-muted)]">• {item.interval}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <CalendarClock size={16} className="text-[var(--text-muted)]" />
          {viewMode === 'week' ? 'Weekly Routine' : 'Today'}
        </div>
        <div className="overflow-x-auto">
          <div
            className={cn(
              'grid gap-3',
              viewMode === 'week' ? 'min-w-[900px] grid-cols-7' : 'grid-cols-1'
            )}
          >
            {visibleDays.map((day) => {
              const isToday = todayKey === day.key;
              const dayTasks = tasksByDay[day.key];
              return (
                <div
                  key={day.key}
                  ref={isToday ? todayColumnRef : undefined}
                  data-testid="scheduled-day-card"
                  className={cn(
                    'rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 min-h-[240px] flex flex-col',
                    isToday && 'border-[var(--accent-primary)] shadow-[0_0_0_1px_rgba(99,102,241,0.35)]'
                  )}
                >
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span className="uppercase tracking-[0.2em]">{day.short}</span>
                    <span className={cn('text-[var(--text-secondary)]', isToday && 'text-[var(--accent-primary)]')}>
                      {format(day.date, 'd')}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                    {day.label}
                  </div>

                  <div className="mt-3 flex-1 space-y-2">
                    {dayTasks.length === 0 ? (
                      <div className="text-xs text-[var(--text-muted)]">No tasks</div>
                    ) : (
                      dayTasks.map((task) => {
                        const assignee = getAssigneeName(task.assignedMemberId);
                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => openEditTaskModal(task)}
                            aria-label={`Edit scheduled task ${task.title}`}
                            className="w-full text-left rounded-xl border px-3 py-2 transition-all hover:brightness-110 hover:border-[var(--border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                            style={{
                              borderColor: `${task.color}55`,
                              backgroundColor: `${task.color}1a`,
                            }}
                          >
                            <p className="text-sm font-medium truncate" style={{ color: task.color }}>
                              {task.title}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                              {format(new Date(`1970-01-01T${task.time}:00`), 'h:mm a')}
                              {assignee && (
                                <span className="ml-1.5 text-[var(--text-secondary)]">· {assignee}</span>
                              )}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
        <div className="flex items-center gap-3 text-sm font-semibold text-[var(--text-primary)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
            <Calendar size={16} className="text-[var(--text-muted)]" />
          </div>
          Next Up
        </div>
        <div className="mt-4">
          {isLoading ? (
            <div className="text-sm text-[var(--text-muted)]">Loading schedule...</div>
          ) : nextUp.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No upcoming tasks"
              description="Create your first recurring task to see it here."
              action={
                <Button onClick={openCreateTaskModal}>
                  <Plus size={18} />
                  Add Task
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-[var(--border-default)]">
              {nextUp.map(({ task, next }) => (
                <div key={task.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: task.color }}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {formatDistanceToNowStrict(next, { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeTaskModal}
        title={editingTask ? 'Edit Recurring Task' : 'Add Recurring Task'}
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <Input
            label="Title"
            placeholder="Task title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            placeholder="Optional description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Time"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              required
            />
            <Select
              label="Day of the Week"
              value={formData.dayOfWeek}
              onChange={(e) => setFormData({
                ...formData,
                dayOfWeek: e.target.value as DayOfWeek,
              })}
              options={WEEK_DAYS.map((day) => ({ value: day.key, label: day.label }))}
            />
          </div>
          <Select
            label="Assigned To"
            value={formData.assignedMemberId || ''}
            onChange={(e) => setFormData({ ...formData, assignedMemberId: e.target.value })}
            options={memberOptions}
          />
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Color</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={cn(
                    'h-8 w-8 rounded-lg border border-[var(--border-default)] transition-transform',
                    formData.color === color && 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-secondary)] scale-110'
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Select ${color}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeTaskModal} className="flex-1">
              Cancel
            </Button>
            {editingTask && (
              <Button type="button" variant="danger" onClick={handleOpenDeleteTask}>
                <Trash2 size={16} />
                Delete Task
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingTask ? 'Save Changes' : 'Add Task'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTaskToDelete(null);
        }}
        title="Delete Task"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Are you sure you want to delete
            {' '}
            <span className="text-[var(--text-primary)] font-medium">{taskToDelete?.title}</span>
            ?
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setTaskToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              className="flex-1"
              onClick={confirmDeleteTask}
              disabled={isDeletingTask}
            >
              {isDeletingTask ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
