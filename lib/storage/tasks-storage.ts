import path from 'path';
import {
  readMarkdownFile,
  writeMarkdownFile,
  deleteFile,
  listFiles,
  DATA_DIR
} from './file-system';
import type { Task, CreateTaskInput, TaskStatus } from '@/types';
import { generateId } from '@/lib/utils/id';
import { toISOString } from '@/lib/utils/date';

const PROJECTS_DIR = path.join(DATA_DIR, 'projects');

function getTasksDir(projectSlug: string): string {
  return path.join(PROJECTS_DIR, projectSlug, 'tasks');
}

function getTaskPath(projectSlug: string, taskId: string): string {
  return path.join(getTasksDir(projectSlug), `${taskId}.md`);
}

interface TaskFrontmatter {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  recurring?: boolean;
  priority: string;
  assignedDeveloperId?: string;
  linkedDocumentIds: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export async function getTasks(projectSlug: string): Promise<Task[]> {
  const tasksDir = getTasksDir(projectSlug);
  const files = await listFiles(tasksDir);
  const tasks: Task[] = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const filePath = path.join(tasksDir, file);
    const result = await readMarkdownFile<TaskFrontmatter>(filePath);

    if (result) {
      const recurring = result.data.recurring ?? result.data.status === 'recurring';
      tasks.push({
        ...result.data,
        recurring,
        description: result.content.trim(),
        priority: result.data.priority as Task['priority'],
      });
    }
  }

  return tasks.sort((a, b) => a.order - b.order);
}

export async function getTask(projectSlug: string, taskId: string): Promise<Task | null> {
  const filePath = getTaskPath(projectSlug, taskId);
  const result = await readMarkdownFile<TaskFrontmatter>(filePath);

  if (!result) return null;

  const recurring = result.data.recurring ?? result.data.status === 'recurring';
  return {
    ...result.data,
    recurring,
    description: result.content.trim(),
    priority: result.data.priority as Task['priority'],
  };
}

export async function createTask(projectSlug: string, input: CreateTaskInput): Promise<Task> {
  const existingTasks = await getTasks(projectSlug);
  const requestedStatus = input.status || 'backlog';
  const recurring = input.recurring ?? requestedStatus === 'recurring';
  const status: TaskStatus = recurring ? 'recurring' : requestedStatus;
  const statusTasks = existingTasks.filter(t => t.status === status);

  const now = toISOString();
  const id = generateId();

  const task: Task = {
    id,
    projectId: input.projectId,
    title: input.title,
    description: input.description || '',
    status,
    recurring,
    priority: input.priority || 'medium',
    assignedDeveloperId: input.assignedDeveloperId,
    linkedDocumentIds: input.linkedDocumentIds || [],
    order: statusTasks.length,
    createdAt: now,
    updatedAt: now,
  };

  const frontmatter: TaskFrontmatter = {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    status: task.status,
    recurring: task.recurring,
    priority: task.priority,
    assignedDeveloperId: task.assignedDeveloperId,
    linkedDocumentIds: task.linkedDocumentIds,
    order: task.order,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };

  const filePath = getTaskPath(projectSlug, id);
  await writeMarkdownFile(filePath, frontmatter, task.description);

  return task;
}

export async function updateTask(
  projectSlug: string,
  taskId: string,
  updates: Partial<Task>
): Promise<Task | null> {
  const task = await getTask(projectSlug, taskId);
  if (!task) return null;

  let nextStatus = updates.status ?? task.status;
  let nextRecurring = updates.recurring ?? task.recurring;

  if (updates.status) {
    nextRecurring = updates.status === 'recurring';
  }

  if (updates.recurring !== undefined) {
    if (updates.recurring) {
      nextStatus = 'recurring';
    } else if (nextStatus === 'recurring') {
      nextStatus = 'backlog';
    }
  }

  const updatedTask: Task = {
    ...task,
    ...updates,
    status: nextStatus,
    recurring: nextRecurring,
    updatedAt: toISOString(),
  };

  // Set completedAt when moving to done
  if (updates.status === 'done' && task.status !== 'done') {
    updatedTask.completedAt = toISOString();
  }

  const frontmatter: TaskFrontmatter = {
    id: updatedTask.id,
    projectId: updatedTask.projectId,
    title: updatedTask.title,
    status: updatedTask.status,
    recurring: updatedTask.recurring,
    priority: updatedTask.priority,
    assignedDeveloperId: updatedTask.assignedDeveloperId,
    linkedDocumentIds: updatedTask.linkedDocumentIds,
    order: updatedTask.order,
    createdAt: updatedTask.createdAt,
    updatedAt: updatedTask.updatedAt,
    completedAt: updatedTask.completedAt,
  };

  const filePath = getTaskPath(projectSlug, taskId);
  await writeMarkdownFile(filePath, frontmatter, updatedTask.description);

  return updatedTask;
}

export async function deleteTask(projectSlug: string, taskId: string): Promise<boolean> {
  const filePath = getTaskPath(projectSlug, taskId);
  await deleteFile(filePath);
  return true;
}

export async function reorderTasks(
  projectSlug: string,
  taskIds: string[],
  status: TaskStatus
): Promise<void> {
  const tasks = await getTasks(projectSlug);

  for (let i = 0; i < taskIds.length; i++) {
    const task = tasks.find(t => t.id === taskIds[i]);
    if (task) {
      await updateTask(projectSlug, task.id, { order: i, status });
    }
  }
}
