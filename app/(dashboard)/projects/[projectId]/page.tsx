'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const taskIdFromQuery = searchParams.get('task');

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [projectSaveError, setProjectSaveError] = useState<string | null>(null);

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [taskForm, setTaskForm] = useState<CreateTaskInput>({
    projectId: '',
    title: '',
    description: '',
    status: 'backlog',
    recurring: false,
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

  useEffect(() => {
    if (project) {
      setProjectName(project.name);
    }
  }, [project]);

  useEffect(() => {
    if (!taskIdFromQuery || tasks.length === 0) return;

    const task = tasks.find((t) => t.id === taskIdFromQuery);
    if (!task) return;

    openEditTaskModal(task);
    router.replace(`/projects/${projectId}`);
  }, [taskIdFromQuery, tasks, projectId, router]);

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
          t.id === activeTask.id
            ? { ...t, status: overColumn.id, recurring: overColumn.id === 'recurring' }
            : t
        )
      );
    }

    // Check if dropping on another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && activeTask.status !== overTask.status) {
      setTasks((tasks) =>
        tasks.map((t) =>
          t.id === activeTask.id
            ? { ...t, status: overTask.status, recurring: overTask.status === 'recurring' }
            : t
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
        t.id === activeTask.id
          ? { ...t, status: newStatus, recurring: newStatus === 'recurring' }
          : t
      )
    );

    // Persist to server
    try {
      await fetch(`/api/projects/${projectId}/tasks/${activeTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, recurring: newStatus === 'recurring' }),
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
      const recurring = taskForm.status === 'recurring' || taskForm.recurring;
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskForm,
          projectId: project?.id,
          recurring,
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
      const recurring = taskForm.status === 'recurring' || taskForm.recurring;
      const res = await fetch(`/api/projects/${projectId}/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskForm, recurring }),
      });
      const updated = await res.json();
      setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
      closeTaskModal();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }

  function handleDeleteTask(task: Task) {
    setTaskToDelete(task);
  }

  async function confirmDeleteTask() {
    if (!taskToDelete) return;
    try {
      setIsDeletingTask(true);
      await fetch(`/api/projects/${projectId}/tasks/${taskToDelete.id}`, {
        method: 'DELETE',
      });
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      setTaskToDelete(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setIsDeletingTask(false);
    }
  }

  async function handleDeleteProject() {
    try {
      setIsDeletingProject(true);
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      router.push('/projects');
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setIsDeletingProject(false);
      setIsDeleteProjectModalOpen(false);
    }
  }

  async function handleUpdateProjectName(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;

    const trimmedName = projectName.trim();
    if (!trimmedName) {
      setProjectSaveError('Project name is required.');
      return;
    }

    if (trimmedName === project.name) return;

    try {
      setIsSavingProject(true);
      setProjectSaveError(null);

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!res.ok) {
        throw new Error('Failed to update project');
      }

      const updated = await res.json();
      setProject(updated);
      setProjectName(updated.name);
    } catch (error) {
      console.error('Failed to update project:', error);
      setProjectSaveError('Could not update the project name.');
    } finally {
      setIsSavingProject(false);
    }
  }

  function openCreateTaskModal(status: TaskStatus = 'backlog') {
    setEditingTask(null);
    setTaskForm({
      projectId: project?.id || '',
      title: '',
      description: '',
      status,
      recurring: status === 'recurring',
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
      recurring: task.recurring,
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
      recurring: false,
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

  const totalTasks = tasks.filter((t) =>
    t.status === 'todo' || t.status === 'in_progress' || t.status === 'done'
  ).length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

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
            aria-label="Project settings"
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Project Metrics */}
      <div className="px-6 py-4 border-b border-[var(--border-default)]">
        <div className="flex flex-wrap items-center gap-8" data-testid="project-metrics">
          <div className="flex flex-col gap-1">
            <span className="text-[var(--text-primary)] text-3xl font-semibold tracking-tight">
              {totalTasks}
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Total Tasks
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[var(--accent-primary)] text-3xl font-semibold tracking-tight">
              {inProgressCount}
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              In Progress
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[var(--accent-success)] text-3xl font-semibold tracking-tight">
              {doneCount}
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Completed
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[var(--accent-success)] text-3xl font-semibold tracking-tight">
              {completionRate}%
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Completion
            </span>
          </div>
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
                        onDelete={() => handleDeleteTask(task)}
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
              onChange={(e) => {
                const nextStatus = e.target.value as TaskStatus;
                setTaskForm({
                  ...taskForm,
                  status: nextStatus,
                  recurring: nextStatus === 'recurring',
                });
              }}
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

      {/* Delete Task Modal */}
      <Modal
        isOpen={!!taskToDelete}
        onClose={() => {
          if (!isDeletingTask) setTaskToDelete(null);
        }}
        title="Delete Task"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">
              This action can’t be undone.
            </p>
            {taskToDelete && (
              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                {taskToDelete.title}
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setTaskToDelete(null)}
              disabled={isDeletingTask}
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
              {isDeletingTask ? 'Deleting...' : 'Delete Task'}
            </Button>
          </div>
        </div>
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
            <form onSubmit={handleUpdateProjectName} className="space-y-3">
              <Input
                label="Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                error={projectSaveError || undefined}
                required
              />
              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    isSavingProject ||
                    projectName.trim().length === 0 ||
                    projectName.trim() === project.name
                  }
                >
                  {isSavingProject ? 'Saving...' : 'Save Changes'}
                </Button>
                <span className="text-xs text-[var(--text-muted)]">
                  Update the project name without changing the URL.
                </span>
              </div>
            </form>
          </div>

          <div className="pt-4 border-t border-[var(--border-default)]">
            <h3 className="text-sm font-medium text-[var(--accent-danger)] mb-2">Danger Zone</h3>
            <Button variant="danger" onClick={() => setIsDeleteProjectModalOpen(true)}>
              <Trash2 size={16} />
              Delete Project
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Project Modal */}
      <Modal
        isOpen={isDeleteProjectModalOpen}
        onClose={() => {
          if (!isDeletingProject) setIsDeleteProjectModalOpen(false);
        }}
        title="Delete Project"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">
              This will permanently delete the project and all its tasks.
            </p>
            {project && (
              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                {project.name}
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setIsDeleteProjectModalOpen(false)}
              disabled={isDeletingProject}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              className="flex-1"
              onClick={handleDeleteProject}
              disabled={isDeletingProject}
            >
              {isDeletingProject ? 'Deleting...' : 'Delete Project'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
