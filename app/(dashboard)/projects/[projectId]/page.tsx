'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowLeft, Plus, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button, Modal, Input, Textarea, Select, Badge, Avatar } from '@/components/ui';
import type { Project, Task, Developer, TaskStatus, CreateTaskInput, TaskPriority } from '@/types';
import { KANBAN_COLUMNS, PRIORITIES } from '@/lib/constants/kanban';
import { KanbanColumn } from '@/components/projects/kanban-column';
import { TaskCard } from '@/components/projects/task-card';

interface Props {
  params: Promise<{ projectId: string }>;
}

export default function ProjectKanbanPage({ params }: Props) {
  const { projectId } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState<CreateTaskInput>({
    projectId: '',
    title: '',
    description: '',
    status: 'backlog',
    priority: 'medium',
    assignedDeveloperId: undefined,
  });

  // Filter states
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [developerFilter, setDeveloperFilter] = useState<string | 'all'>('all');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchData();
  }, [projectId]);

  async function fetchData() {
    try {
      const [projectRes, tasksRes, devsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/tasks`),
        fetch('/api/developers'),
      ]);

      if (!projectRes.ok) {
        router.push('/projects');
        return;
      }

      const [projectData, tasksData, devsData] = await Promise.all([
        projectRes.json(),
        tasksRes.json(),
        devsRes.json(),
      ]);

      setProject(projectData);
      setTasks(tasksData);
      setDevelopers(devsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function getTasksByStatus(status: TaskStatus): Task[] {
    return tasks
      .filter((task) => {
        if (task.status !== status) return false;
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
        if (developerFilter !== 'all' && task.assignedDeveloperId !== developerFilter) return false;
        return true;
      })
      .sort((a, b) => a.order - b.order);
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task || null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;

    // Check if dropping on a column
    const overColumn = KANBAN_COLUMNS.find((col) => col.id === overId);
    if (overColumn && activeTask.status !== overColumn.id) {
      setTasks((tasks) =>
        tasks.map((t) =>
          t.id === activeTask.id ? { ...t, status: overColumn.id } : t
        )
      );
    }

    // Check if dropping on another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && activeTask.status !== overTask.status) {
      setTasks((tasks) =>
        tasks.map((t) =>
          t.id === activeTask.id ? { ...t, status: overTask.status } : t
        )
      );
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    const overTask = tasks.find((t) => t.id === overId);
    const overColumn = KANBAN_COLUMNS.find((col) => col.id === overId);

    let newStatus = activeTask.status;
    let newTasks = [...tasks];

    if (overColumn) {
      newStatus = overColumn.id;
    } else if (overTask) {
      newStatus = overTask.status;

      // Reorder within same status
      const statusTasks = newTasks.filter((t) => t.status === newStatus);
      const oldIndex = statusTasks.findIndex((t) => t.id === active.id);
      const newIndex = statusTasks.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(statusTasks, oldIndex, newIndex);
        newTasks = newTasks.map((t) => {
          if (t.status !== newStatus) return t;
          const idx = reordered.findIndex((r) => r.id === t.id);
          return { ...t, order: idx };
        });
      }
    }

    // Update local state
    setTasks(
      newTasks.map((t) =>
        t.id === activeTask.id ? { ...t, status: newStatus } : t
      )
    );

    // Persist to server
    try {
      await fetch(`/api/projects/${projectId}/tasks/${activeTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      // Reorder tasks
      const statusTasks = newTasks.filter((t) => t.status === newStatus);
      await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reorder: true,
          taskIds: statusTasks.map((t) => t.id),
          status: newStatus,
        }),
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      fetchData(); // Refresh on error
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskForm,
          projectId: project?.id,
        }),
      });
      const newTask = await res.json();
      setTasks([...tasks, newTask]);
      closeTaskModal();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  }

  async function handleUpdateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTask || !taskForm.title.trim()) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskForm),
      });
      const updated = await res.json();
      setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
      closeTaskModal();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }

  async function handleDeleteProject() {
    if (!confirm('Are you sure you want to delete this project and all its tasks?')) return;

    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      router.push('/projects');
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }

  function openCreateTaskModal(status: TaskStatus = 'backlog') {
    setEditingTask(null);
    setTaskForm({
      projectId: project?.id || '',
      title: '',
      description: '',
      status,
      priority: 'medium',
      assignedDeveloperId: undefined,
    });
    setIsTaskModalOpen(true);
  }

  function openEditTaskModal(task: Task) {
    setEditingTask(task);
    setTaskForm({
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedDeveloperId: task.assignedDeveloperId,
    });
    setIsTaskModalOpen(true);
  }

  function closeTaskModal() {
    setIsTaskModalOpen(false);
    setEditingTask(null);
    setTaskForm({
      projectId: '',
      title: '',
      description: '',
      status: 'backlog',
      priority: 'medium',
      assignedDeveloperId: undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const taskCount = tasks.length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const completionRate = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                {project.name}
              </h1>
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {taskCount} task{taskCount !== 1 ? 's' : ''} · {completionRate}% complete
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-secondary)]"
          >
            <option value="all">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>

          {developers.length > 0 && (
            <select
              value={developerFilter}
              onChange={(e) => setDeveloperFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-secondary)]"
            >
              <option value="all">All Members</option>
              {developers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}

          <Button onClick={() => openCreateTaskModal()}>
            <Plus size={18} />
            New Task
          </Button>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max">
            {KANBAN_COLUMNS.map((column) => {
              const columnTasks = getTasksByStatus(column.id);
              return (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.label}
                  count={columnTasks.length}
                  onAddTask={() => openCreateTaskModal(column.id)}
                >
                  <SortableContext
                    items={columnTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        developer={developers.find((d) => d.id === task.assignedDeveloperId)}
                        onEdit={() => openEditTaskModal(task)}
                        onDelete={() => handleDeleteTask(task.id)}
                      />
                    ))}
                  </SortableContext>
                </KanbanColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeTask && (
              <TaskCard
                task={activeTask}
                developer={developers.find((d) => d.id === activeTask.assignedDeveloperId)}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create/Edit Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={closeTaskModal}
        title={editingTask ? 'Edit Task' : 'Create Task'}
        size="lg"
      >
        <form onSubmit={editingTask ? handleUpdateTask : handleCreateTask} className="space-y-4">
          <Input
            label="Title"
            placeholder="Task title"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            required
          />

          <Textarea
            label="Description"
            placeholder="Task description (supports markdown)"
            value={taskForm.description || ''}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            className="min-h-[120px]"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={taskForm.status}
              onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}
              options={KANBAN_COLUMNS.map((c) => ({ value: c.id, label: c.label }))}
            />

            <Select
              label="Priority"
              value={taskForm.priority}
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
              options={PRIORITIES.map((p) => ({ value: p.id, label: p.label }))}
            />
          </div>

          <Select
            label="Assigned To"
            value={taskForm.assignedDeveloperId || ''}
            onChange={(e) => setTaskForm({ ...taskForm, assignedDeveloperId: e.target.value || undefined })}
            options={[
              { value: '', label: 'Unassigned' },
              ...developers.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeTaskModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Project Settings Modal */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Project Settings"
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Project Info</h3>
            <p className="text-sm text-[var(--text-secondary)]">{project.name}</p>
            {project.description && (
              <p className="text-sm text-[var(--text-muted)] mt-1">{project.description}</p>
            )}
          </div>

          <div className="pt-4 border-t border-[var(--border-default)]">
            <h3 className="text-sm font-medium text-[var(--accent-danger)] mb-2">Danger Zone</h3>
            <Button variant="danger" onClick={handleDeleteProject}>
              <Trash2 size={16} />
              Delete Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
