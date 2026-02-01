import path from 'path';
import { readJsonFile, writeJsonFile, DATA_DIR } from './file-system';
import type { Developer, CreateDeveloperInput } from '@/types';
import { generateId } from '@/lib/utils/id';
import { toISOString } from '@/lib/utils/date';
import { DEVELOPER_COLORS } from '@/lib/constants/kanban';

const DEVELOPERS_FILE = path.join(DATA_DIR, 'developers', 'developers.json');

export async function getDevelopers(): Promise<Developer[]> {
  const developers = await readJsonFile<Developer[]>(DEVELOPERS_FILE);
  return developers || [];
}

export async function getDeveloper(id: string): Promise<Developer | null> {
  const developers = await getDevelopers();
  return developers.find(d => d.id === id) || null;
}

export async function createDeveloper(input: CreateDeveloperInput): Promise<Developer> {
  const developers = await getDevelopers();

  const developer: Developer = {
    id: generateId(),
    name: input.name,
    email: input.email,
    role: input.role,
    color: input.color || DEVELOPER_COLORS[developers.length % DEVELOPER_COLORS.length],
    projectIds: [],
    createdAt: toISOString(),
  };

  developers.push(developer);
  await writeJsonFile(DEVELOPERS_FILE, developers);

  return developer;
}

export async function updateDeveloper(id: string, updates: Partial<Developer>): Promise<Developer | null> {
  const developers = await getDevelopers();
  const index = developers.findIndex(d => d.id === id);

  if (index === -1) return null;

  developers[index] = { ...developers[index], ...updates };
  await writeJsonFile(DEVELOPERS_FILE, developers);

  return developers[index];
}

export async function deleteDeveloper(id: string): Promise<boolean> {
  const developers = await getDevelopers();
  const filtered = developers.filter(d => d.id !== id);

  if (filtered.length === developers.length) return false;

  await writeJsonFile(DEVELOPERS_FILE, filtered);
  return true;
}

export async function addDeveloperToProject(developerId: string, projectId: string): Promise<void> {
  const developers = await getDevelopers();
  const developer = developers.find(d => d.id === developerId);

  if (developer && !developer.projectIds.includes(projectId)) {
    developer.projectIds.push(projectId);
    await writeJsonFile(DEVELOPERS_FILE, developers);
  }
}

export async function removeDeveloperFromProject(developerId: string, projectId: string): Promise<void> {
  const developers = await getDevelopers();
  const developer = developers.find(d => d.id === developerId);

  if (developer) {
    developer.projectIds = developer.projectIds.filter(id => id !== projectId);
    await writeJsonFile(DEVELOPERS_FILE, developers);
  }
}
