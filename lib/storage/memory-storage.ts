import path from 'path';
import {
  readMarkdownFile,
  readJsonFile,
  writeJsonFile,
  listDirs,
  listFiles,
  DATA_DIR
} from './file-system';
import type { DayConversation, ConversationMessage, MemoryFavorites } from '@/types';

const MEMORY_DIR = path.join(DATA_DIR, 'memory');
const FAVORITES_FILE = path.join(MEMORY_DIR, 'favorites.json');

interface ConversationFrontmatter {
  date: string;
  messageCount?: number;
}

function parseConversationContent(content: string): ConversationMessage[] {
  const messages: ConversationMessage[] = [];
  const lines = content.split('\n');

  let currentMessage: Partial<ConversationMessage> | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    // Pattern: ## HH:MM - Role
    const headerMatch = line.match(/^##\s+(\d{1,2}:\d{2})\s*-\s*(.+)$/);

    if (headerMatch) {
      // Save previous message
      if (currentMessage && currentMessage.role) {
        messages.push({
          role: currentMessage.role,
          content: currentContent.join('\n').trim(),
          timestamp: currentMessage.timestamp || '',
        });
      }

      // Start new message
      const [, time, roleText] = headerMatch;
      const roleLower = roleText.toLowerCase().trim();

      let role: ConversationMessage['role'] = 'user';
      if (roleLower.includes('assistant') || roleLower.includes('clowdbot') || roleLower.includes('bot')) {
        role = 'assistant';
      } else if (roleLower.includes('system')) {
        role = 'system';
      }

      currentMessage = {
        role,
        timestamp: time,
      };
      currentContent = [];
    } else if (currentMessage) {
      currentContent.push(line);
    }
  }

  // Save last message
  if (currentMessage && currentMessage.role) {
    messages.push({
      role: currentMessage.role,
      content: currentContent.join('\n').trim(),
      timestamp: currentMessage.timestamp || '',
    });
  }

  return messages;
}

export async function getConversation(date: string): Promise<DayConversation | null> {
  // date format: YYYY-MM-DD
  const [year, month, day] = date.split('-');
  const filePath = path.join(MEMORY_DIR, year, month, `${day}.md`);

  const result = await readMarkdownFile<ConversationFrontmatter>(filePath);
  if (!result) return null;

  const messages = parseConversationContent(result.content);

  return {
    date: result.data.date || date,
    messages,
  };
}

export async function getAvailableDates(): Promise<string[]> {
  const dates: string[] = [];

  const years = await listDirs(MEMORY_DIR);
  for (const year of years) {
    if (!/^\d{4}$/.test(year)) continue;

    const months = await listDirs(path.join(MEMORY_DIR, year));
    for (const month of months) {
      if (!/^\d{2}$/.test(month)) continue;

      const files = await listFiles(path.join(MEMORY_DIR, year, month));
      for (const file of files) {
        if (file.endsWith('.md')) {
          const day = file.replace('.md', '');
          dates.push(`${year}-${month}-${day}`);
        }
      }
    }
  }

  return dates.sort().reverse();
}

export async function searchConversations(keyword: string): Promise<Array<{
  date: string;
  excerpt: string;
  messageIndex: number;
}>> {
  const results: Array<{ date: string; excerpt: string; messageIndex: number }> = [];
  const dates = await getAvailableDates();
  const searchLower = keyword.toLowerCase();

  for (const date of dates) {
    const conversation = await getConversation(date);
    if (!conversation) continue;

    conversation.messages.forEach((message, index) => {
      if (message.content.toLowerCase().includes(searchLower)) {
        // Extract excerpt around the match
        const contentLower = message.content.toLowerCase();
        const matchIndex = contentLower.indexOf(searchLower);
        const start = Math.max(0, matchIndex - 50);
        const end = Math.min(message.content.length, matchIndex + keyword.length + 50);
        let excerpt = message.content.substring(start, end);

        if (start > 0) excerpt = '...' + excerpt;
        if (end < message.content.length) excerpt = excerpt + '...';

        results.push({
          date,
          excerpt,
          messageIndex: index,
        });
      }
    });
  }

  return results;
}

export async function getFavorites(): Promise<string[]> {
  const favorites = await readJsonFile<MemoryFavorites>(FAVORITES_FILE);
  return favorites?.dates || [];
}

export async function toggleFavorite(date: string): Promise<string[]> {
  const favorites = await readJsonFile<MemoryFavorites>(FAVORITES_FILE) || { dates: [] };

  const index = favorites.dates.indexOf(date);
  if (index > -1) {
    favorites.dates.splice(index, 1);
  } else {
    favorites.dates.push(date);
  }

  await writeJsonFile(FAVORITES_FILE, favorites);
  return favorites.dates;
}

export async function isFavorite(date: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.includes(date);
}
