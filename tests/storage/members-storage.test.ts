/* @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { withStorage } from '../helpers/storage-helpers';

describe('members-storage', () => {
  it('creates, updates, and deletes members', async () => {
    await withStorage(async () => {
      const storage = await import('../../lib/storage/members-storage');

      const member = await storage.createMember({
        name: 'Frank Worsley',
        role: 'Navigator',
        description: 'Backend',
      });
      expect(member.description).toBe('Backend');

      const updated = await storage.updateMember(member.id, { role: 'Captain' });
      expect(updated?.role).toBe('Captain');

      const deleted = await storage.deleteMember(member.id);
      expect(deleted).toBe(true);
    });
  });

  it('adds and removes members from projects', async () => {
    await withStorage(async () => {
      const storage = await import('../../lib/storage/members-storage');

      const member = await storage.createMember({ name: 'Tom Crean' });
      await storage.addMemberToProject(member.id, 'project-1');
      let loaded = await storage.getMember(member.id);
      expect(loaded?.projectIds).toContain('project-1');

      await storage.removeMemberFromProject(member.id, 'project-1');
      loaded = await storage.getMember(member.id);
      expect(loaded?.projectIds).not.toContain('project-1');
    });
  });
});
