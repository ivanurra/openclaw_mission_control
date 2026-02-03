/* @vitest-environment node */
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { describe, expect, it } from 'vitest';
import { withStorage } from '../helpers/storage-helpers';

describe('memory-storage', () => {
  it('loads conversations and favorites', async () => {
    await withStorage(async (dataDir) => {
      const memoryDir = path.join(dataDir, 'memory', '2024', '07');
      await mkdir(memoryDir, { recursive: true });

      const content = [
        '---',
        'date: 2024-07-12',
        '---',
        '',
        '## 09:15 - User',
        'We reached the ice.',
        '',
        '## 09:16 - Assistant',
        'Log updated.',
      ].join('\n');

      await writeFile(path.join(memoryDir, '12.md'), content, 'utf-8');

      const storage = await import('../../lib/storage/memory-storage');
      const conversation = await storage.getConversation('2024-07-12');
      expect(conversation?.messages).toHaveLength(2);

      const dates = await storage.getAvailableDates();
      expect(dates).toContain('2024-07-12');

      const favorites = await storage.toggleFavorite('2024-07-12');
      expect(favorites).toContain('2024-07-12');
    });
  });
});
