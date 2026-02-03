/* @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { withStorage } from '../helpers/storage-helpers';

describe('projects-storage', () => {
  it('creates projects with unique slugs and supports updates', async () => {
    await withStorage(async () => {
      const storage = await import('../../lib/storage/projects-storage');

      const first = await storage.createProject({ name: 'Alpha' });
      const second = await storage.createProject({ name: 'Alpha' });

      expect(first.slug).toBe('alpha');
      expect(second.slug).toBe('alpha-1');

      const projects = await storage.getProjects();
      expect(projects).toHaveLength(2);

      const updated = await storage.updateProject(first.id, { name: 'Alpha 2' });
      expect(updated?.name).toBe('Alpha 2');

      const bySlug = await storage.getProjectBySlug(first.slug);
      expect(bySlug?.id).toBe(first.id);
    });
  });

  it('deletes projects by id', async () => {
    await withStorage(async () => {
      const storage = await import('../../lib/storage/projects-storage');

      const project = await storage.createProject({ name: 'Beta' });
      const deleted = await storage.deleteProject(project.id);
      expect(deleted).toBe(true);

      const remaining = await storage.getProjects();
      expect(remaining).toHaveLength(0);
    });
  });
});
