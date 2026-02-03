/* @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { withStorage } from '../helpers/storage-helpers';

describe('developers-storage', () => {
  it('creates, updates, and deletes developers', async () => {
    await withStorage(async () => {
      const storage = await import('../../lib/storage/developers-storage');

      const dev = await storage.createDeveloper({
        name: 'Frank Worsley',
        role: 'Navigator',
        description: 'Backend',
      });
      expect(dev.description).toBe('Backend');

      const updated = await storage.updateDeveloper(dev.id, { role: 'Captain' });
      expect(updated?.role).toBe('Captain');

      const deleted = await storage.deleteDeveloper(dev.id);
      expect(deleted).toBe(true);
    });
  });

  it('adds and removes developers from projects', async () => {
    await withStorage(async () => {
      const storage = await import('../../lib/storage/developers-storage');

      const dev = await storage.createDeveloper({ name: 'Tom Crean' });
      await storage.addDeveloperToProject(dev.id, 'project-1');
      let loaded = await storage.getDeveloper(dev.id);
      expect(loaded?.projectIds).toContain('project-1');

      await storage.removeDeveloperFromProject(dev.id, 'project-1');
      loaded = await storage.getDeveloper(dev.id);
      expect(loaded?.projectIds).not.toContain('project-1');
    });
  });
});
