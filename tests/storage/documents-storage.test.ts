/* @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { withStorage } from '../helpers/storage-helpers';

describe('documents-storage', () => {
  it('creates folders in root and children correctly', async () => {
    await withStorage(async () => {
      const storage = await import('../../lib/storage/documents-storage');

      const root = await storage.createFolder({ name: 'Root Folder' });
      const child = await storage.createFolder({ name: 'Child Folder', parentId: root.id });

      const folders = await storage.getFolders();
      expect(folders).toHaveLength(2);
      expect(root.parentId).toBeNull();
      expect(child.parentId).toBe(root.id);
    });
  });

  it('creates documents and lists them by folder', async () => {
    await withStorage(async () => {
      const storage = await import('../../lib/storage/documents-storage');

      const folder = await storage.createFolder({ name: 'Specs' });
      await storage.createDocument({ title: 'Ice map', folderId: folder.id });
      await storage.createDocument({ title: 'Open water log' });

      const inFolder = await storage.getDocumentsByFolder(folder.id);
      const inRoot = await storage.getDocumentsByFolder(null);

      expect(inFolder).toHaveLength(1);
      expect(inRoot).toHaveLength(1);
    });
  });

  it('deletes folder and its documents', async () => {
    await withStorage(async () => {
      const storage = await import('../../lib/storage/documents-storage');

      const folder = await storage.createFolder({ name: 'Notes' });
      const doc = await storage.createDocument({ title: 'Manifest', folderId: folder.id });

      const deleted = await storage.deleteFolder(folder.id);
      expect(deleted).toBe(true);

      const documents = await storage.getDocuments();
      expect(documents.find(d => d.id === doc.id)).toBeUndefined();
    });
  });

  it('moves folders across levels while preventing invalid nesting', async () => {
    await withStorage(async () => {
      const storage = await import('../../lib/storage/documents-storage');

      const root = await storage.createFolder({ name: 'Root' });
      const child = await storage.createFolder({ name: 'Child', parentId: root.id });

      const invalid = await storage.updateFolder(root.id, { parentId: child.id });
      expect(invalid).toBeNull();

      const moved = await storage.updateFolder(child.id, { parentId: null });
      expect(moved?.parentId).toBeNull();
    });
  });

  it('updates folder slug when renaming a folder', async () => {
    await withStorage(async () => {
      const storage = await import('../../lib/storage/documents-storage');

      const folder = await storage.createFolder({ name: 'Design Notes' });
      const updated = await storage.updateFolder(folder.id, { name: 'UI Specs' });

      expect(updated?.name).toBe('UI Specs');
      expect(updated?.slug).toBe('ui-specs');
    });
  });
});
