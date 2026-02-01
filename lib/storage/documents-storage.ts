import path from 'path';
import {
  readJsonFile,
  writeJsonFile,
  readMarkdownFile,
  writeMarkdownFile,
  deleteFile,
  listFiles,
  ensureDir,
  DATA_DIR
} from './file-system';
import type { Document, CreateDocumentInput, Folder, CreateFolderInput, FolderIndex } from '@/types';
import { generateId, slugify } from '@/lib/utils/id';
import { toISOString } from '@/lib/utils/date';

const DOCUMENTS_DIR = path.join(DATA_DIR, 'documents');
const INDEX_FILE = path.join(DOCUMENTS_DIR, 'index.json');

interface DocumentFrontmatter {
  id: string;
  slug: string;
  title: string;
  folderId: string | null;
  linkedTaskIds: string[];
  linkedProjectIds: string[];
  createdAt: string;
  updatedAt: string;
}

// Folder operations
export async function getFolderIndex(): Promise<FolderIndex> {
  const index = await readJsonFile<FolderIndex>(INDEX_FILE);
  return index || { folders: [], rootFolderIds: [] };
}

async function saveFolderIndex(index: FolderIndex): Promise<void> {
  await writeJsonFile(INDEX_FILE, index);
}

export async function getFolders(): Promise<Folder[]> {
  const index = await getFolderIndex();
  return index.folders;
}

export async function getFolder(id: string): Promise<Folder | null> {
  const index = await getFolderIndex();
  return index.folders.find(f => f.id === id) || null;
}

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const index = await getFolderIndex();
  const id = generateId();
  const slug = slugify(input.name);

  const siblingFolders = index.folders.filter(f => f.parentId === (input.parentId || null));

  const folder: Folder = {
    id,
    slug,
    name: input.name,
    parentId: input.parentId || null,
    order: siblingFolders.length,
    createdAt: toISOString(),
  };

  index.folders.push(folder);
  if (!folder.parentId) {
    index.rootFolderIds.push(id);
  }

  await saveFolderIndex(index);
  return folder;
}

export async function updateFolder(id: string, updates: Partial<Folder>): Promise<Folder | null> {
  const index = await getFolderIndex();
  const folderIndex = index.folders.findIndex(f => f.id === id);

  if (folderIndex === -1) return null;

  index.folders[folderIndex] = { ...index.folders[folderIndex], ...updates };
  await saveFolderIndex(index);

  return index.folders[folderIndex];
}

export async function deleteFolder(id: string): Promise<boolean> {
  const index = await getFolderIndex();

  // Get all descendant folder IDs
  const getDescendantIds = (folderId: string): string[] => {
    const children = index.folders.filter(f => f.parentId === folderId);
    return [folderId, ...children.flatMap(c => getDescendantIds(c.id))];
  };

  const idsToDelete = getDescendantIds(id);

  index.folders = index.folders.filter(f => !idsToDelete.includes(f.id));
  index.rootFolderIds = index.rootFolderIds.filter(fid => fid !== id);

  await saveFolderIndex(index);

  // Delete all documents in these folders
  const documents = await getDocuments();
  for (const doc of documents) {
    if (doc.folderId && idsToDelete.includes(doc.folderId)) {
      await deleteDocument(doc.id);
    }
  }

  return true;
}

// Document operations
function getDocumentPath(slug: string): string {
  return path.join(DOCUMENTS_DIR, `${slug}.md`);
}

export async function getDocuments(): Promise<Document[]> {
  const files = await listFiles(DOCUMENTS_DIR);
  const documents: Document[] = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const filePath = path.join(DOCUMENTS_DIR, file);
    const result = await readMarkdownFile<DocumentFrontmatter>(filePath);

    if (result) {
      documents.push({
        ...result.data,
        content: result.content.trim(),
      });
    }
  }

  return documents.sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getDocument(id: string): Promise<Document | null> {
  const documents = await getDocuments();
  return documents.find(d => d.id === id) || null;
}

export async function getDocumentsByFolder(folderId: string | null): Promise<Document[]> {
  const documents = await getDocuments();
  return documents.filter(d => d.folderId === folderId);
}

export async function createDocument(input: CreateDocumentInput): Promise<Document> {
  const id = generateId();
  let slug = slugify(input.title);

  // Ensure unique slug
  const documents = await getDocuments();
  let counter = 1;
  const originalSlug = slug;
  while (documents.some(d => d.slug === slug)) {
    slug = `${originalSlug}-${counter}`;
    counter++;
  }

  const now = toISOString();

  const document: Document = {
    id,
    slug,
    title: input.title,
    content: input.content || '',
    folderId: input.folderId ?? null,
    linkedTaskIds: [],
    linkedProjectIds: [],
    createdAt: now,
    updatedAt: now,
  };

  const frontmatter: DocumentFrontmatter = {
    id: document.id,
    slug: document.slug,
    title: document.title,
    folderId: document.folderId,
    linkedTaskIds: document.linkedTaskIds,
    linkedProjectIds: document.linkedProjectIds,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };

  await ensureDir(DOCUMENTS_DIR);
  const filePath = getDocumentPath(slug);
  await writeMarkdownFile(filePath, frontmatter, document.content);

  return document;
}

export async function updateDocument(id: string, updates: Partial<Document>): Promise<Document | null> {
  const document = await getDocument(id);
  if (!document) return null;

  const updatedDocument: Document = {
    ...document,
    ...updates,
    updatedAt: toISOString(),
  };

  const frontmatter: DocumentFrontmatter = {
    id: updatedDocument.id,
    slug: updatedDocument.slug,
    title: updatedDocument.title,
    folderId: updatedDocument.folderId,
    linkedTaskIds: updatedDocument.linkedTaskIds,
    linkedProjectIds: updatedDocument.linkedProjectIds,
    createdAt: updatedDocument.createdAt,
    updatedAt: updatedDocument.updatedAt,
  };

  const filePath = getDocumentPath(document.slug);
  await writeMarkdownFile(filePath, frontmatter, updatedDocument.content);

  return updatedDocument;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const document = await getDocument(id);
  if (!document) return false;

  const filePath = getDocumentPath(document.slug);
  await deleteFile(filePath);

  return true;
}
