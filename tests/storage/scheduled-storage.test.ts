/* @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { withStorage } from '../helpers/storage-helpers';

describe('scheduled-storage', () => {
  it('creates, updates, and deletes scheduled tasks', async () => {
    await withStorage(async () => {
      const storage = await import('../../lib/storage/scheduled-storage');

      const created = await storage.createScheduledTask({
        title: 'Morning Brief',
        description: 'Daily sync',
        time: '09:30',
        dayOfWeek: 'monday',
        color: '#6366f1',
      });

      expect(created.id).toBeTruthy();
      expect(created.title).toBe('Morning Brief');
      expect(created.dayOfWeek).toBe('monday');

      const list = await storage.getScheduledTasks();
      expect(list).toHaveLength(1);

      const updated = await storage.updateScheduledTask(created.id, { title: 'Morning Briefing' });
      expect(updated?.title).toBe('Morning Briefing');

      const deleted = await storage.deleteScheduledTask(created.id);
      expect(deleted).toBe(true);

      const remaining = await storage.getScheduledTasks();
      expect(remaining).toHaveLength(0);
    });
  });
});
