/* @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { withStorage } from '../helpers/storage-helpers';

describe('tasks-storage', () => {
  it('creates tasks and preserves ordering per status', async () => {
    await withStorage(async () => {
      const projects = await import('../../lib/storage/projects-storage');
      const tasks = await import('../../lib/storage/tasks-storage');

      const project = await projects.createProject({ name: 'Endurance' });

      const first = await tasks.createTask(project.slug, {
        projectId: project.id,
        title: 'First',
      });
      const second = await tasks.createTask(project.slug, {
        projectId: project.id,
        title: 'Second',
      });
      const done = await tasks.createTask(project.slug, {
        projectId: project.id,
        title: 'Done task',
        status: 'done',
      });

      const all = await tasks.getTasks(project.slug);
      expect(all).toHaveLength(3);
      expect(first.order).toBe(0);
      expect(second.order).toBe(1);
      expect(done.order).toBe(0);
    });
  });

  it('updates tasks and sets completedAt when moved to done', async () => {
    await withStorage(async () => {
      const projects = await import('../../lib/storage/projects-storage');
      const tasks = await import('../../lib/storage/tasks-storage');

      const project = await projects.createProject({ name: 'Aurora' });
      const created = await tasks.createTask(project.slug, {
        projectId: project.id,
        title: 'Ship supplies',
      });

      const updated = await tasks.updateTask(project.slug, created.id, { status: 'done' });
      expect(updated?.status).toBe('done');
      expect(updated?.completedAt).toBeTruthy();
    });
  });

  it('creates recurring tasks and preserves recurring status', async () => {
    await withStorage(async () => {
      const projects = await import('../../lib/storage/projects-storage');
      const tasks = await import('../../lib/storage/tasks-storage');

      const project = await projects.createProject({ name: 'Rhythm' });
      const recurring = await tasks.createTask(project.slug, {
        projectId: project.id,
        title: 'Weekly sync',
        status: 'recurring',
      });

      expect(recurring.status).toBe('recurring');
      expect(recurring.recurring).toBe(true);

      const fetched = await tasks.getTask(project.slug, recurring.id);
      expect(fetched?.status).toBe('recurring');
      expect(fetched?.recurring).toBe(true);
    });
  });
});
