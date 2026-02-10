import path from 'path';
import { readJsonFile, writeJsonFile, DATA_DIR } from './file-system';
import type { ScheduledTask, CreateScheduledTaskInput } from '@/types';
import { generateId } from '@/lib/utils/id';
import { toISOString } from '@/lib/utils/date';

const SCHEDULED_FILE = path.join(DATA_DIR, 'scheduled', 'tasks.json');

export async function getScheduledTasks(): Promise<ScheduledTask[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasks = await readJsonFile<any[]>(SCHEDULED_FILE);
  if (!tasks) return [];
  // Backwards compat: migrate old assignedDeveloperId → assignedMemberId
  return tasks.map(t => {
    if (t.assignedDeveloperId && !t.assignedMemberId) {
      t.assignedMemberId = t.assignedDeveloperId;
      delete t.assignedDeveloperId;
    }
    return t as ScheduledTask;
  });
}

export async function createScheduledTask(input: CreateScheduledTaskInput): Promise<ScheduledTask> {
  const tasks = await getScheduledTasks();
  const now = toISOString();

  const task: ScheduledTask = {
    id: generateId(),
    title: input.title,
    description: input.description || '',
    time: input.time,
    dayOfWeek: input.dayOfWeek,
    color: input.color,
    assignedMemberId: input.assignedMemberId,
    createdAt: now,
    updatedAt: now,
  };

  tasks.push(task);
  await writeJsonFile(SCHEDULED_FILE, tasks);
  return task;
}

export async function updateScheduledTask(
  id: string,
  updates: Partial<ScheduledTask>
): Promise<ScheduledTask | null> {
  const tasks = await getScheduledTasks();
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return null;

  const updated: ScheduledTask = {
    ...tasks[index],
    ...updates,
    updatedAt: toISOString(),
  };

  tasks[index] = updated;
  await writeJsonFile(SCHEDULED_FILE, tasks);
  return updated;
}

export async function deleteScheduledTask(id: string): Promise<boolean> {
  const tasks = await getScheduledTasks();
  const filtered = tasks.filter((task) => task.id !== id);
  if (filtered.length === tasks.length) return false;
  await writeJsonFile(SCHEDULED_FILE, filtered);
  return true;
}
