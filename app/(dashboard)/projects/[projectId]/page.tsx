'use client';

import { useState, useEffect, use, useMemo, useRef } from 'react';
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
import {
  ArrowLeft,
  Plus,
  Settings,
  Trash2,
  Paperclip,
  MessageSquare,
  Send,
  Clock,
  X,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { Button, Modal, Input, Textarea, Select, Avatar } from '@/components/ui';
import type {
  Project,
  Task,
  Member,
  TaskStatus,
  CreateTaskInput,
  TaskPriority,
  TaskAttachment,
  TaskComment,
  Document,
  Folder,
} from '@/types';
import { KANBAN_COLUMNS, PRIORITIES } from '@/lib/constants/kanban';
import { KanbanColumn } from '@/components/projects/kanban-column';
import { TaskCard } from '@/components/projects/task-card';
import { formatDateTime } from '@/lib/utils/date';

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
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [projectSaveError, setProjectSaveError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isLinkingDocs, setIsLinkingDocs] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [isDocsPickerOpen, setIsDocsPickerOpen] = useState(false);
  const [docsForLinking, setDocsForLinking] = useState<Document[]>([]);
  const [foldersForLinking, setFoldersForLinking] = useState<Folder[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [docSearchQuery, setDocSearchQuery] = useState('');

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
    assignedMemberId: undefined,
  });

  // Filter states
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [memberFilter, setMemberFilter] = useState<string | 'all'>('all');

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
        fetch('/api/members'),
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
      setMembers(devsData);
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
        if (memberFilter !== 'all' && task.assignedMemberId !== memberFilter) return false;
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

  function applyTaskUpdate(updatedTask: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    if (editingTask?.id === updatedTask.id) {
      setEditingTask(updatedTask);
    }
  }

  function closeDocsPicker() {
    setIsDocsPickerOpen(false);
    setSelectedDocIds([]);
    setDocSearchQuery('');
  }

  async function handleOpenDocsPicker() {
    if (!editingTask) return;
    setAttachmentError(null);

    try {
      const [docsRes, foldersRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/folders'),
      ]);

      if (!docsRes.ok || !foldersRes.ok) {
        throw new Error('Failed to load docs');
      }

      const [docsData, foldersData] = await Promise.all([
        docsRes.json() as Promise<Document[]>,
        foldersRes.json() as Promise<Folder[]>,
      ]);

      setDocsForLinking(docsData);
      setFoldersForLinking(foldersData);
      setSelectedDocIds([]);
      setDocSearchQuery('');
      setIsDocsPickerOpen(true);
    } catch (error) {
      console.error('Failed to load docs for linking:', error);
      setAttachmentError('Could not load documents from Docs.');
    }
  }

  async function handleLinkDocuments() {
    if (!editingTask || selectedDocIds.length === 0) return;

    try {
      setIsLinkingDocs(true);
      setAttachmentError(null);

      const res = await fetch(`/api/projects/${projectId}/tasks/${editingTask.id}/attachments/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: selectedDocIds }),
      });

      if (!res.ok) {
        throw new Error('Failed to link documents');
      }

      const updated = await res.json();
      applyTaskUpdate(updated);
      closeDocsPicker();
    } catch (error) {
      console.error('Failed to link documents:', error);
      setAttachmentError('Could not link documents.');
    } finally {
      setIsLinkingDocs(false);
    }
  }

  function toggleSelectedDoc(documentId: string, shouldSelect: boolean) {
    setSelectedDocIds((prev) => {
      if (shouldSelect) {
        if (prev.includes(documentId)) return prev;
        return [...prev, documentId];
      }
      return prev.filter((id) => id !== documentId);
    });
  }

  async function handleAttachmentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!editingTask) return;
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    setIsUploadingAttachment(true);
    setAttachmentError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const res = await fetch(`/api/projects/${projectId}/tasks/${editingTask.id}/attachments`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to upload attachment');
      }

      const updated = await res.json();
      applyTaskUpdate(updated);
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      setAttachmentError('Could not upload attachment.');
    } finally {
      setIsUploadingAttachment(false);
      if (event.target) event.target.value = '';
    }
  }

  async function handleRemoveAttachment(attachment: TaskAttachment) {
    if (!editingTask) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/tasks/${editingTask.id}/attachments/${attachment.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        throw new Error('Failed to remove attachment');
      }
      const updated = await res.json();
      applyTaskUpdate(updated);
    } catch (error) {
      console.error('Failed to remove attachment:', error);
      setAttachmentError('Could not remove attachment.');
    }
  }

  async function handleAddComment() {
    if (!editingTask) return;
    const trimmed = commentDraft.trim();
    if (!trimmed) return;

    const newComment: TaskComment = {
      id: getClientId(),
      authorName: 'You',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    try {
      setIsPostingComment(true);
      const updatedComments = [...(editingTask.comments || []), newComment];
      const res = await fetch(`/api/projects/${projectId}/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: updatedComments }),
      });
      if (!res.ok) {
        throw new Error('Failed to add comment');
      }
      const updated = await res.json();
      applyTaskUpdate(updated);
      setCommentDraft('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsPostingComment(false);
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

  const detailTask = editingTask;
  const foldersById = useMemo(
    () => new Map(foldersForLinking.map((folder) => [folder.id, folder])),
    [foldersForLinking]
  );

  const linkedDocumentIds = useMemo(() => {
    const linkedIds = new Set<string>();
    for (const attachment of detailTask?.attachments ?? []) {
      if (attachment.documentId) {
        linkedIds.add(attachment.documentId);
      }
    }
    return linkedIds;
  }, [detailTask?.attachments]);

  const filteredDocsForLinking = useMemo(() => {
    const normalizedQuery = docSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) return docsForLinking;
    return docsForLinking.filter((doc) => {
      const folder = doc.folderId ? foldersById.get(doc.folderId) : null;
      const folderName = folder?.name.toLowerCase() || '';
      return (
        doc.title.toLowerCase().includes(normalizedQuery)
        || folderName.includes(normalizedQuery)
      );
    });
  }, [docSearchQuery, docsForLinking, foldersById]);
  const docsById = useMemo(
    () => new Map(docsForLinking.map((doc) => [doc.id, doc])),
    [docsForLinking]
  );

  const mentionQuery = useMemo(() => {
    const match = commentDraft.match(/@([\w\s.-]*)$/);
    return match ? match[1].trim().toLowerCase() : '';
  }, [commentDraft]);

  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery) return [];
    return members
      .filter((m) => m.name.toLowerCase().includes(mentionQuery))
      .slice(0, 5);
  }, [members, mentionQuery]);

  function insertMention(name: string) {
    setCommentDraft((prev) => prev.replace(/@([\w\s.-]*)$/, `@${name} `));
  }

  function formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFolderPath(folderId: string | null): string {
    if (!folderId) return 'Root';
    const parts: string[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folder = foldersById.get(currentId);
      if (!folder) break;
      parts.unshift(folder.name);
      currentId = folder.parentId;
    }

    return parts.length > 0 ? parts.join(' / ') : 'Root';
  }

  function renderCommentContent(content: string) {
    const parts = content.split(/(@[\w.-]+)/g);
    return parts.map((part, index) =>
      part.startsWith('@') ? (
        <span key={`${part}-${index}`} className="text-[var(--accent-primary)] font-medium">
          {part}
        </span>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    );
  }

  function getClientId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function openCreateTaskModal(status: TaskStatus = 'backlog') {
    setEditingTask(null);
    closeDocsPicker();
    setTaskForm({
      projectId: project?.id || '',
      title: '',
      description: '',
      status,
      recurring: status === 'recurring',
      priority: 'medium',
      assignedMemberId: undefined,
    });
    setCommentDraft('');
    setAttachmentError(null);
    setIsTaskModalOpen(true);
  }

  function openEditTaskModal(task: Task) {
    setEditingTask(task);
    closeDocsPicker();
    setTaskForm({
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      recurring: task.recurring,
      priority: task.priority,
      assignedMemberId: task.assignedMemberId,
    });
    setCommentDraft('');
    setAttachmentError(null);
    setIsTaskModalOpen(true);
  }

  function closeTaskModal() {
    setIsTaskModalOpen(false);
    setEditingTask(null);
    closeDocsPicker();
    setTaskForm({
      projectId: '',
      title: '',
      description: '',
      status: 'backlog',
      recurring: false,
      priority: 'medium',
      assignedMemberId: undefined,
    });
    setCommentDraft('');
    setAttachmentError(null);
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

          {members.length > 0 && (
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-secondary)]"
            >
              <option value="all">All Members</option>
              {members.map((d) => (
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
                        member={members.find((d) => d.id === task.assignedMemberId)}
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
                member={members.find((d) => d.id === activeTask.assignedMemberId)}
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
        size="xl"
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
            value={taskForm.assignedMemberId || ''}
            onChange={(e) => setTaskForm({ ...taskForm, assignedMemberId: e.target.value || undefined })}
            options={[
              { value: '', label: 'Unassigned' },
              ...members.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />

          {detailTask ? (
            <div className="space-y-6 pt-2">
              {/* Timeline */}
              <div className="border-t border-[var(--border-default)] pt-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  <Clock size={12} />
                  Timeline
                </div>
                <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                  <div className="flex items-center justify-between">
                    <span>Created</span>
                    <span>{formatDateTime(detailTask.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Updated</span>
                    <span>{formatDateTime(detailTask.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div className="border-t border-[var(--border-default)] pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    <Paperclip size={12} />
                    Attachments ({detailTask.attachments?.length ?? 0})
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      multiple
                      onChange={handleAttachmentUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleOpenDocsPicker()}
                      disabled={isUploadingAttachment || isLinkingDocs}
                    >
                      {isLinkingDocs ? 'Linking...' : 'Link docs'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={isUploadingAttachment || isLinkingDocs}
                    >
                      {isUploadingAttachment ? 'Uploading...' : 'Add files'}
                    </Button>
                  </div>
                </div>
                {attachmentError && (
                  <p className="mt-2 text-sm text-[var(--accent-danger)]">{attachmentError}</p>
                )}
                <div className="mt-3 space-y-2">
                  {(detailTask.attachments?.length ?? 0) === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No attachments yet.</p>
                  ) : (
                    (detailTask.attachments ?? []).map((attachment) => {
                      const isDocsAttachment = attachment.source === 'docs' || !!attachment.documentId;
                      const linkedDocument = attachment.documentId
                        ? docsById.get(attachment.documentId)
                        : null;
                      const attachmentHref = isDocsAttachment && attachment.documentId
                        ? `/docs/${attachment.documentId}`
                        : `/api/projects/${projectId}/tasks/${detailTask.id}/attachments/${attachment.id}`;

                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)]"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-[var(--text-primary)] truncate">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {isDocsAttachment && attachment.documentId
                                ? linkedDocument ? `Docs • ${getFolderPath(linkedDocument.folderId)}` : 'Docs'
                                : formatFileSize(attachment.size)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={attachmentHref}
                              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            >
                              {isDocsAttachment ? 'Open' : 'Download'}
                            </a>
                            <button
                              type="button"
                              onClick={() => void handleRemoveAttachment(attachment)}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--bg-elevated)]"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Comments */}
              <div className="border-t border-[var(--border-default)] pt-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  <MessageSquare size={12} />
                  Comments ({detailTask.comments?.length ?? 0})
                </div>

                <div className="mt-3 space-y-3">
                  {(detailTask.comments?.length ?? 0) === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No comments yet.</p>
                  ) : (
                    (detailTask.comments ?? []).map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar name={comment.authorName} color="#6366f1" size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[var(--text-primary)]">
                              {comment.authorName}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">
                              {formatDateTime(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] mt-1 break-words">
                            {renderCommentContent(comment.content)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}

                  <div className="relative">
                    <Textarea
                      label="Add a comment"
                      placeholder="Type your comment and use @ to mention someone"
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      className="min-h-[90px]"
                    />

                    {mentionSuggestions.length > 0 && (
                      <div className="absolute left-0 bottom-full mb-2 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-lg overflow-hidden z-10">
                        {mentionSuggestions.map((dev) => (
                          <button
                            key={dev.id}
                            type="button"
                            onClick={() => insertMention(dev.name)}
                            className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                          >
                            {dev.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddComment}
                      disabled={isPostingComment || commentDraft.trim().length === 0}
                    >
                      {isPostingComment ? 'Posting...' : 'Post Comment'}
                      <Send size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t border-[var(--border-default)] pt-4 text-sm text-[var(--text-muted)]">
              Save the task to add timeline details, attachments, linked docs, and comments.
            </div>
          )}

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

      <Modal
        isOpen={isDocsPickerOpen}
        onClose={() => {
          if (!isLinkingDocs) closeDocsPicker();
        }}
        title="Link Docs"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Search Docs"
            placeholder="Search by title or folder"
            value={docSearchQuery}
            onChange={(event) => setDocSearchQuery(event.target.value)}
          />

          <div className="max-h-[360px] overflow-y-auto rounded-lg border border-[var(--border-default)] divide-y divide-[var(--border-default)]">
            {filteredDocsForLinking.length === 0 ? (
              <div className="p-4 text-sm text-[var(--text-muted)]">
                No documents found.
              </div>
            ) : (
              filteredDocsForLinking.map((doc) => {
                const alreadyLinked = linkedDocumentIds.has(doc.id);
                const isSelected = selectedDocIds.includes(doc.id);

                return (
                  <label
                    key={doc.id}
                    className="flex items-start gap-3 p-3 cursor-pointer hover:bg-[var(--bg-tertiary)]"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={isSelected}
                      disabled={alreadyLinked}
                      onChange={(event) => toggleSelectedDoc(doc.id, event.target.checked)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-[var(--text-muted)] shrink-0" />
                        <p className="text-sm text-[var(--text-primary)] truncate">{doc.title}</p>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {getFolderPath(doc.folderId)}
                      </p>
                    </div>
                    {alreadyLinked && (
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        Linked
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{selectedDocIds.length} selected</span>
            <span>{linkedDocumentIds.size} already linked</span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={closeDocsPicker}
              disabled={isLinkingDocs}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => void handleLinkDocuments()}
              disabled={selectedDocIds.length === 0 || isLinkingDocs}
            >
              {isLinkingDocs ? 'Linking...' : 'Link selected'}
            </Button>
          </div>
        </div>
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
