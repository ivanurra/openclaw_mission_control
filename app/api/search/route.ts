import { NextRequest, NextResponse } from 'next/server';
import { getProjects } from '@/lib/storage/projects-storage';
import { getDocuments } from '@/lib/storage/documents-storage';
import { getMembers } from '@/lib/storage/members-storage';
import { getTasks } from '@/lib/storage/tasks-storage';
import { searchConversations } from '@/lib/storage/memory-storage';
import { KANBAN_COLUMNS } from '@/lib/constants/kanban';
import type { TaskPriority } from '@/types';

export type SearchResultType = 'project' | 'task' | 'document' | 'person' | 'memory';

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  meta?: string;
  priority?: TaskPriority;
  score: number;
}

const statusLabels = new Map(KANBAN_COLUMNS.map((column) => [column.id, column.label]));
const TYPE_LIMITS: Record<SearchResultType, number> = {
  project: 6,
  task: 8,
  document: 6,
  person: 6,
  memory: 6,
};

function normalize(value: string): string {
  return value.toLowerCase();
}

function tokenize(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function computeMatchScore(fields: string[], tokens: string[]) {
  let score = 0;
  const matched = new Set<string>();

  for (const field of fields) {
    const haystack = normalize(field || '');
    if (!haystack) continue;

    for (const token of tokens) {
      const index = haystack.indexOf(token);
      if (index === -1) continue;
      matched.add(token);
      if (index === 0) score += 6;
      else if (index < 10) score += 4;
      else score += 2;
    }
  }

  if (matched.size === 0) return { matches: 0, score: 0 };
  return { matches: matched.size, score: matched.size * 10 + score };
}

function buildExcerpt(text: string, tokens: string[], maxLength = 120): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const lower = normalize(cleaned);
  let matchIndex = -1;
  let matchLength = 0;

  for (const token of tokens) {
    const idx = lower.indexOf(token);
    if (idx !== -1 && (matchIndex === -1 || idx < matchIndex)) {
      matchIndex = idx;
      matchLength = token.length;
    }
  }

  if (matchIndex === -1) {
    return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}…` : cleaned;
  }

  const start = Math.max(0, matchIndex - 40);
  const end = Math.min(cleaned.length, matchIndex + matchLength + 60);
  let excerpt = cleaned.slice(start, end);

  if (start > 0) excerpt = `…${excerpt}`;
  if (end < cleaned.length) excerpt = `${excerpt}…`;
  return excerpt;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.trim() || '';

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return NextResponse.json({ results: [] });
  }

  try {
    const [projects, documents, members] = await Promise.all([
      getProjects(),
      getDocuments(),
      getMembers(),
    ]);

    const projectTasks = await Promise.all(
      projects.map(async (project) => ({
        project,
        tasks: await getTasks(project.slug),
      }))
    );

    const results: SearchResultItem[] = [];

    for (const project of projects) {
      const { matches, score } = computeMatchScore(
        [project.name, project.description || ''],
        tokens
      );
      if (matches === 0) continue;
      results.push({
        id: project.id,
        type: 'project',
        title: project.name,
        subtitle: project.description || undefined,
        href: `/projects/${project.slug}`,
        meta: `${project.memberIds.length} member${project.memberIds.length !== 1 ? 's' : ''}`,
        score,
      });
    }

    for (const doc of documents) {
      const { matches, score } = computeMatchScore(
        [doc.title, doc.content || ''],
        tokens
      );
      if (matches === 0) continue;
      const subtitle = buildExcerpt(doc.content || '', tokens) || undefined;
      results.push({
        id: doc.id,
        type: 'document',
        title: doc.title,
        subtitle,
        href: `/docs?doc=${doc.id}`,
        score,
      });
    }

    for (const member of members) {
      const { matches, score } = computeMatchScore(
        [member.name, member.role || '', member.description || ''],
        tokens
      );
      if (matches === 0) continue;
      results.push({
        id: member.id,
        type: 'person',
        title: member.name,
        subtitle: member.role || member.description || undefined,
        href: `/people?member=${member.id}`,
        meta: member.projectIds.length
          ? `${member.projectIds.length} project${member.projectIds.length !== 1 ? 's' : ''}`
          : undefined,
        score,
      });
    }

    for (const { project, tasks } of projectTasks) {
      for (const task of tasks) {
        const { matches, score } = computeMatchScore(
          [task.title, task.description || ''],
          tokens
        );
        if (matches === 0) continue;
        const subtitle = buildExcerpt(task.description || '', tokens) || undefined;
        results.push({
          id: task.id,
          type: 'task',
          title: task.title,
          subtitle,
          href: `/projects/${project.slug}?task=${task.id}`,
          meta: `${project.name} · ${statusLabels.get(task.status) ?? task.status}`,
          priority: task.priority,
          score,
        });
      }
    }

    const memoryMatches = await Promise.all(
      tokens.map((token) => searchConversations(token))
    );
    const memoryMap = new Map<string, { date: string; excerpt: string; score: number }>();

    for (const tokenResults of memoryMatches) {
      for (const result of tokenResults) {
        const key = `${result.date}-${result.messageIndex}`;
        if (memoryMap.has(key)) continue;
        const excerpt = result.excerpt;
        const { score } = computeMatchScore([excerpt], tokens);
        memoryMap.set(key, { date: result.date, excerpt, score });
      }
    }

    for (const [key, value] of memoryMap.entries()) {
      results.push({
        id: key,
        type: 'memory',
        title: value.date,
        subtitle: value.excerpt,
        href: `/memory?date=${value.date}`,
        score: value.score || 1,
      });
    }

    const grouped: Record<SearchResultType, SearchResultItem[]> = {
      project: [],
      task: [],
      document: [],
      person: [],
      memory: [],
    };

    for (const result of results) {
      grouped[result.type].push(result);
    }

    const ordered: SearchResultItem[] = [];
    (Object.keys(grouped) as SearchResultType[]).forEach((type) => {
      grouped[type]
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
        .slice(0, TYPE_LIMITS[type])
        .forEach((item) => ordered.push(item));
    });

    return NextResponse.json({ results: ordered });
  } catch (error) {
    console.error('Failed to run global search:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
