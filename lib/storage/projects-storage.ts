import path from 'path';
import {
  readJsonFile,
  writeJsonFile,
  ensureDir,
  listDirs,
  deleteDir,
  DATA_DIR
} from './file-system';
import type { Project, CreateProjectInput } from '@/types';
import { generateId, slugify } from '@/lib/utils/id';
import { toISOString } from '@/lib/utils/date';
import { PROJECT_COLORS } from '@/lib/constants/kanban';

const PROJECTS_DIR = path.join(DATA_DIR, 'projects');

export async function getProjects(): Promise<Project[]> {
  const folders = await listDirs(PROJECTS_DIR);
  const projects: Project[] = [];

  for (const folder of folders) {
    const projectPath = path.join(PROJECTS_DIR, folder, 'project.json');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await readJsonFile<any>(projectPath);
    if (raw) {
      // Backwards compat: migrate old developerIds → memberIds
      if (raw.developerIds && !raw.memberIds) {
        raw.memberIds = raw.developerIds;
        delete raw.developerIds;
      }
      raw.memberIds = raw.memberIds ?? [];
      projects.push(raw as Project);
    }
  }

  return projects.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getProject(id: string): Promise<Project | null> {
  const projects = await getProjects();
  return projects.find(p => p.id === id) || null;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const projectPath = path.join(PROJECTS_DIR, slug, 'project.json');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await readJsonFile<any>(projectPath);
  if (!raw) return null;
  // Backwards compat: migrate old developerIds → memberIds
  if (raw.developerIds && !raw.memberIds) {
    raw.memberIds = raw.developerIds;
    delete raw.developerIds;
  }
  raw.memberIds = raw.memberIds ?? [];
  return raw as Project;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const projects = await getProjects();
  const id = generateId();
  let slug = slugify(input.name);

  // Ensure unique slug
  let counter = 1;
  const originalSlug = slug;
  while (projects.some(p => p.slug === slug)) {
    slug = `${originalSlug}-${counter}`;
    counter++;
  }

  const now = toISOString();

  const project: Project = {
    id,
    slug,
    name: input.name,
    description: input.description,
    color: input.color || PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
    createdAt: now,
    updatedAt: now,
    memberIds: input.memberIds || [],
  };

  const projectDir = path.join(PROJECTS_DIR, slug);
  await ensureDir(path.join(projectDir, 'tasks'));
  await writeJsonFile(path.join(projectDir, 'project.json'), project);

  return project;
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
  const projects = await getProjects();
  const project = projects.find(p => p.id === id);

  if (!project) return null;

  const updatedProject = {
    ...project,
    ...updates,
    updatedAt: toISOString()
  };

  const projectPath = path.join(PROJECTS_DIR, project.slug, 'project.json');
  await writeJsonFile(projectPath, updatedProject);

  return updatedProject;
}

export async function deleteProject(id: string): Promise<boolean> {
  const project = await getProject(id);
  if (!project) return false;

  const projectDir = path.join(PROJECTS_DIR, project.slug);
  await deleteDir(projectDir);

  return true;
}

export function getProjectDir(slug: string): string {
  return path.join(PROJECTS_DIR, slug);
}
