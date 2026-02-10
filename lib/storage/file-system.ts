import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';

export const DATA_DIR = process.env.MC_DATA_DIR
  ? path.resolve(process.env.MC_DATA_DIR)
  : path.join(process.cwd(), 'data');

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function readMarkdownFile<T>(filePath: string): Promise<{ data: T; content: string } | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(raw);
    return { data: data as T, content };
  } catch {
    return null;
  }
}

export async function writeMarkdownFile<T extends object>(
  filePath: string,
  frontmatter: T,
  content: string
): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const sanitizedFrontmatter = sanitizeFrontmatter(frontmatter);
  const output = matter.stringify(
    content,
    (sanitizedFrontmatter && typeof sanitizedFrontmatter === 'object')
      ? sanitizedFrontmatter
      : {}
  );
  await fs.writeFile(filePath, output, 'utf-8');
}

function sanitizeFrontmatter(value: unknown): unknown {
  if (value === undefined) return undefined;

  if (Array.isArray(value)) {
    return value
      .map(sanitizeFrontmatter)
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => [key, sanitizeFrontmatter(val)] as const)
      .filter(([, val]) => val !== undefined);
    return Object.fromEntries(entries);
  }

  return value;
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // File might not exist
  }
}

export async function deleteDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch {
    // Directory might not exist
  }
}

export async function listFiles(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
}

export async function listDirs(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    return [];
  }
}
