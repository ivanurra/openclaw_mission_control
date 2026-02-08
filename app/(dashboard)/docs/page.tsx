'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { marked } from 'marked';
import TurndownService from 'turndown';
import {
  FolderPlus,
  FilePlus2,
  Upload,
  FileText,
  Folder,
  ChevronRight,
  ChevronDown,
  Trash2,
  Pencil,
  Search,
  X,
  FileDown,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button, Modal, Input, EmptyState, Select, Badge } from '@/components/ui';
import type { Document, Folder as FolderType, CreateFolderInput } from '@/types';
import { cn } from '@/lib/utils/cn';
import { formatDateTime } from '@/lib/utils/date';

type DragEntity =
  | { type: 'doc'; id: string }
  | { type: 'folder'; id: string };

export default function DocsPage() {
  const searchParams = useSearchParams();
  const requestedDocId = searchParams.get('doc');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState<Document | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isMovingItem, setIsMovingItem] = useState(false);
  const [dragEntity, setDragEntity] = useState<DragEntity | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [uiNotice, setUiNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const isSyncingRef = useRef(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'doc' | 'folder';
    id: string;
    name: string;
  } | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<{ id: string; name: string } | null>(null);
  const [renamedFolderName, setRenamedFolderName] = useState('');
  const [isRenamingFolder, setIsRenamingFolder] = useState(false);

  // Modal states
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderForm, setFolderForm] = useState<CreateFolderInput>({ name: '', parentId: null });
  const [autoSaveEnabled] = useState(true);
  const folderMap = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const turndownService = useMemo(() => new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
  }), []);

  const showNotice = useCallback((type: 'success' | 'error', message: string) => {
    setUiNotice({ type, message });
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setUiNotice(null);
      noticeTimerRef.current = null;
    }, 3600);
  }, []);

  function inferTitleFromMarkdown(fileName: string, content: string): string {
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
    if (frontmatterMatch) {
      const titleMatch = frontmatterMatch[1].match(/^title:\s*(.+)$/im);
      if (titleMatch && titleMatch[1]) {
        const frontmatterTitle = titleMatch[1].trim().replace(/^['"]|['"]$/g, '');
        if (frontmatterTitle) return frontmatterTitle;
      }
    }

    const headingMatch = content.match(/^\s*#\s+(.+?)\s*$/m);
    if (headingMatch && headingMatch[1]) {
      const headingTitle = headingMatch[1].trim();
      if (headingTitle) return headingTitle;
    }

    const fileBasedTitle = fileName
      .replace(/\.md$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();

    return fileBasedTitle || 'Imported Document';
  }

  function readFileAsText(file: File): Promise<string> {
    if (typeof file.text === 'function') {
      return file.text();
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file);
    });
  }

  function toMarkdownFileName(title: string): string {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${slug || 'document'}.md`;
  }

  const createUniqueDocumentTitle = useCallback(
    (
      baseTitle: string,
      folderId: string | null,
      existingDocuments: Array<Pick<Document, 'title' | 'folderId'>> = documents
    ): string => {
      const cleanBase = baseTitle.trim() || 'Untitled';
      const normalize = (value: string) => value.trim().toLowerCase();
      const siblingTitles = new Set(
        existingDocuments
          .filter((doc) => doc.folderId === folderId)
          .map((doc) => normalize(doc.title))
      );

      if (!siblingTitles.has(normalize(cleanBase))) {
        return cleanBase;
      }

      let counter = 2;
      let candidate = `${cleanBase} (${counter})`;
      while (siblingTitles.has(normalize(candidate))) {
        counter += 1;
        candidate = `${cleanBase} (${counter})`;
      }

      return candidate;
    },
    [documents]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap-content',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: tiptap }) => {
      if (isSyncingRef.current) return;
      const html = tiptap.getHTML();
      const markdown = turndownService.turndown(html);
      setEditedContent(markdown);
      setHasChanges(true);
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => () => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
  }, []);

  async function fetchData() {
    try {
      const [docsRes, foldersRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/folders'),
      ]);
      const [docsData, foldersData] = await Promise.all([
        docsRes.json(),
        foldersRes.json(),
      ]);
      setDocuments(docsData);
      setFolders(foldersData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const fetchDocument = useCallback(async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`);
      if (!res.ok) return;
      const data = await res.json();
      setActiveDocument(data);
      setEditedTitle(data.title);
      setEditedContent(data.content);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to fetch document:', error);
    }
  }, []);

  useEffect(() => {
    if (!editor) return;
    if (!activeDocument) {
      isSyncingRef.current = true;
      editor.commands.clearContent(true);
      isSyncingRef.current = false;
      return;
    }
    isSyncingRef.current = true;
    const html = activeDocument.content ? marked.parse(activeDocument.content) : '';
    editor.commands.setContent(html, false);
    isSyncingRef.current = false;
  }, [editor, activeDocument?.id]);

  async function handleCreateDocumentInline() {
    try {
      const title = createUniqueDocumentTitle('Untitled', selectedFolderId);
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: '',
          folderId: selectedFolderId,
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to create document');
      }
      const newDoc = await res.json();
      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedDocId(newDoc.id);
      fetchDocument(newDoc.id);
    } catch (error) {
      console.error('Failed to create document:', error);
      showNotice('error', 'Could not create a new document.');
    }
  }

  async function handleImportMarkdownFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    if (hasChanges) {
      const canImport = confirm('You have unsaved changes. Import and open the new document anyway?');
      if (!canImport) return;
    }

    const targetFolderId = selectedFolderId ?? activeDocument?.folderId ?? null;
    const existingDocs: Array<Pick<Document, 'title' | 'folderId'>> = documents.map((doc) => ({
      title: doc.title,
      folderId: doc.folderId,
    }));
    const importedDocuments: Document[] = [];
    let skippedFiles = 0;

    setIsImporting(true);
    try {
      for (const file of files) {
        if (!file.name.toLowerCase().endsWith('.md')) {
          skippedFiles += 1;
          continue;
        }

        const content = await readFileAsText(file);
        const baseTitle = inferTitleFromMarkdown(file.name, content);
        const title = createUniqueDocumentTitle(baseTitle, targetFolderId, existingDocs);
        existingDocs.push({ title, folderId: targetFolderId });

        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content,
            folderId: targetFolderId,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to import ${file.name}`);
        }

        const importedDoc: Document = await res.json();
        importedDocuments.push(importedDoc);
      }

      if (importedDocuments.length > 0) {
        setDocuments((prev) => [...[...importedDocuments].reverse(), ...prev]);
        const openedDocument = importedDocuments[importedDocuments.length - 1];
        if (openedDocument.folderId) {
          setExpandedFolders((prev) => {
            const next = new Set(prev);
            next.add(openedDocument.folderId);
            return next;
          });
        }
        setSelectedDocId(openedDocument.id);
        setSelectedFolderId(openedDocument.folderId ?? null);
        await fetchDocument(openedDocument.id);
      }

      if (importedDocuments.length > 0 && skippedFiles === 0) {
        showNotice(
          'success',
          importedDocuments.length === 1
            ? 'Markdown file imported successfully.'
            : `${importedDocuments.length} Markdown files imported successfully.`
        );
      } else if (importedDocuments.length > 0 && skippedFiles > 0) {
        showNotice('success', `${importedDocuments.length} imported, ${skippedFiles} skipped (only .md allowed).`);
      } else {
        showNotice('error', 'Only .md files can be imported.');
      }
    } catch (error) {
      console.error('Failed to import markdown files:', error);
      showNotice('error', 'Could not import Markdown files. Please try again.');
    } finally {
      setIsImporting(false);
    }
  }

  function handleExportMarkdown() {
    if (!activeDocument) return;

    try {
      const markdownContent = editedContent || '';
      const fileName = toMarkdownFileName(editedTitle || activeDocument.title);
      const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotice('success', `Exported as ${fileName}.`);
    } catch (error) {
      console.error('Failed to export markdown file:', error);
      showNotice('error', 'Could not export this document.');
    }
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!folderForm.name.trim()) return;

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...folderForm,
          parentId: folderForm.parentId ?? null,
        }),
      });
      const newFolder = await res.json();
      setFolders([...folders, newFolder]);
      setIsFolderModalOpen(false);
      setFolderForm({ name: '', parentId: null });
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  }

  async function handleRenameFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!renameFolderTarget || isRenamingFolder) return;

    const nextName = renamedFolderName.trim();
    if (!nextName) return;
    if (nextName === renameFolderTarget.name) {
      setRenameFolderTarget(null);
      setRenamedFolderName('');
      return;
    }

    setIsRenamingFolder(true);
    try {
      const res = await fetch(`/api/folders/${renameFolderTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName }),
      });
      if (!res.ok) {
        throw new Error('Failed to rename folder');
      }
      const updatedFolder: FolderType = await res.json();
      setFolders((prev) => prev.map((folder) => (folder.id === updatedFolder.id ? updatedFolder : folder)));
      setRenameFolderTarget(null);
      setRenamedFolderName('');
      showNotice('success', `Folder renamed to "${updatedFolder.name}".`);
    } catch (error) {
      console.error('Failed to rename folder:', error);
      showNotice('error', 'Could not rename this folder.');
    } finally {
      setIsRenamingFolder(false);
    }
  }

  async function deleteDocumentById(id: string) {
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      setDocuments(documents.filter((d) => d.id !== id));
      if (selectedDocId === id) {
        setSelectedDocId(null);
        setActiveDocument(null);
        setEditedTitle('');
        setEditedContent('');
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  }

  async function deleteFolderById(id: string) {
    try {
      await fetch(`/api/folders/${id}`, { method: 'DELETE' });
      setFolders(folders.filter((f) => f.id !== id));
      setDocuments(documents.filter((d) => d.folderId !== id));
      if (selectedFolderId === id) setSelectedFolderId(null);
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  }

  function toggleFolder(folderId: string) {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  }

  function getChildFolders(parentId: string | null): FolderType[] {
    return folders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }

  function getDocumentsInFolder(folderId: string | null): Document[] {
    return documents.filter((d) => d.folderId === folderId);
  }

  function getFolderPath(folderId: string | null): string {
    if (!folderId) return 'All Documents';
    const parts: string[] = [];
    let currentId: string | null = folderId;
    while (currentId) {
      const folder = folderMap.get(currentId);
      if (!folder) break;
      parts.unshift(folder.name);
      currentId = folder.parentId;
    }
    return parts.length > 0 ? parts.join(' / ') : 'All Documents';
  }

  function getDescendantFolderIds(folderId: string): string[] {
    const children = folders.filter((folder) => folder.parentId === folderId);
    return children.flatMap((child) => [child.id, ...getDescendantFolderIds(child.id)]);
  }

  function canDropIntoFolder(targetFolderId: string | null): boolean {
    if (!dragEntity) return false;

    if (dragEntity.type === 'doc') {
      const draggedDoc = documents.find((doc) => doc.id === dragEntity.id);
      if (!draggedDoc) return false;
      return draggedDoc.folderId !== targetFolderId;
    }

    const draggedFolder = folderMap.get(dragEntity.id);
    if (!draggedFolder) return false;

    if (draggedFolder.id === targetFolderId) return false;
    if (targetFolderId && getDescendantFolderIds(draggedFolder.id).includes(targetFolderId)) return false;

    return draggedFolder.parentId !== targetFolderId;
  }

  function clearDragState() {
    setDragEntity(null);
    setDragOverFolderId(null);
  }

  function handleItemDragStart(event: React.DragEvent, entity: DragEntity) {
    setDragEntity(entity);
    setDragOverFolderId(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${entity.type}:${entity.id}`);
  }

  function handleDropZoneDragOver(event: React.DragEvent, targetFolderId: string | null) {
    if (!dragEntity || !canDropIntoFolder(targetFolderId)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(targetFolderId);
  }

  async function moveEntityToFolder(targetFolderId: string | null) {
    if (!dragEntity || !canDropIntoFolder(targetFolderId) || isMovingItem) return;

    setIsMovingItem(true);
    try {
      if (dragEntity.type === 'doc') {
        const res = await fetch(`/api/documents/${dragEntity.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: targetFolderId }),
        });
        if (!res.ok) {
          throw new Error('Failed to move document');
        }
        const updatedDoc: Document = await res.json();
        setDocuments((prev) => prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc)));
        if (selectedDocId === updatedDoc.id) {
          setSelectedFolderId(updatedDoc.folderId);
          setActiveDocument((prev) => (prev && prev.id === updatedDoc.id ? updatedDoc : prev));
        }
        if (updatedDoc.folderId) {
          setExpandedFolders((prev) => new Set(prev).add(updatedDoc.folderId));
        }
        showNotice('success', `Moved "${updatedDoc.title}" successfully.`);
        return;
      }

      const draggedFolder = folderMap.get(dragEntity.id);
      if (!draggedFolder) return;

      const siblingCount = folders.filter(
        (folder) => folder.parentId === targetFolderId && folder.id !== draggedFolder.id
      ).length;

      const res = await fetch(`/api/folders/${draggedFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: targetFolderId,
          order: siblingCount,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to move folder');
      }

      const updatedFolder: FolderType = await res.json();
      setFolders((prev) => prev.map((folder) => (folder.id === updatedFolder.id ? updatedFolder : folder)));
      if (updatedFolder.parentId) {
        setExpandedFolders((prev) => new Set(prev).add(updatedFolder.parentId));
      }
      showNotice('success', `Moved folder "${updatedFolder.name}" successfully.`);
    } catch (error) {
      console.error('Failed to move item:', error);
      showNotice('error', 'Could not move this item.');
    } finally {
      setIsMovingItem(false);
    }
  }

  async function handleDropZoneDrop(event: React.DragEvent, targetFolderId: string | null) {
    event.preventDefault();
    event.stopPropagation();
    await moveEntityToFolder(targetFolderId);
    clearDragState();
  }

  const docSearchResults = useMemo(() => {
    const query = docSearchQuery.trim().toLowerCase();
    if (!query) return [];

    return documents
      .filter((doc) => `${doc.title} ${doc.content}`.toLowerCase().includes(query))
      .slice(0, 20);
  }, [documents, docSearchQuery]);

  function buildFolderOptions(parentId: string | null, depth: number = 0): { value: string; label: string }[] {
    return getChildFolders(parentId).flatMap((folder) => ([
      { value: folder.id, label: `${'— '.repeat(depth)}${folder.name}` },
      ...buildFolderOptions(folder.id, depth + 1),
    ]));
  }

  function renderFolderTree(parentId: string | null, level: number = 0): React.ReactNode {
    const childFolders = getChildFolders(parentId);

    return childFolders.map((folder) => {
      const isExpanded = expandedFolders.has(folder.id);
      const isSelected = selectedFolderId === folder.id;
      const hasChildren = getChildFolders(folder.id).length > 0 || getDocumentsInFolder(folder.id).length > 0;
      const docCount = getDocumentsInFolder(folder.id).length;
      const isDragOver = dragOverFolderId === folder.id && canDropIntoFolder(folder.id);

      return (
        <div key={folder.id}>
          <div
            className={cn(
              'group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
              isSelected ? 'bg-[var(--bg-elevated)]' : 'hover:bg-[var(--bg-elevated)]',
              isDragOver && 'bg-[var(--accent-primary)]/15 ring-1 ring-[var(--accent-primary)]'
            )}
            style={{ paddingLeft: `${8 + level * 16}px` }}
            onClick={() => {
              setSelectedFolderId(folder.id);
              if (hasChildren) toggleFolder(folder.id);
            }}
            draggable
            onDragStart={(event) => handleItemDragStart(event, { type: 'folder', id: folder.id })}
            onDragEnd={clearDragState}
            onDragOver={(event) => handleDropZoneDragOver(event, folder.id)}
            onDrop={(event) => void handleDropZoneDrop(event, folder.id)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
              className="p-0.5 text-[var(--text-muted)]"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <Folder size={16} className="text-[var(--text-muted)]" />
            <span className="flex-1 text-sm text-[var(--text-primary)] truncate">{folder.name}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRenameFolderTarget({ id: folder.id, name: folder.name });
                  setRenamedFolderName(folder.name);
                }}
                aria-label="Rename folder"
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name });
                }}
                aria-label="Delete folder"
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent-danger)]"
              >
                <Trash2 size={12} />
              </button>
              <Badge className="text-[10px]">{docCount}</Badge>
            </div>
          </div>
          {isExpanded && (
            <div>
              {renderDocumentItems(folder.id, level + 1)}
              {renderFolderTree(folder.id, level + 1)}
            </div>
          )}
        </div>
      );
    });
  }

  function renderDocumentItems(folderId: string | null, level: number): React.ReactNode {
    const docs = getDocumentsInFolder(folderId);
    return docs.map((doc) => {
      const isActive = selectedDocId === doc.id;
      return (
        <div
          key={doc.id}
          className={cn(
            'group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
            isActive ? 'bg-[var(--bg-elevated)]' : 'hover:bg-[var(--bg-elevated)]'
          )}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => selectDocument(doc)}
          draggable
          onDragStart={(event) => handleItemDragStart(event, { type: 'doc', id: doc.id })}
          onDragEnd={clearDragState}
        >
          <FileText size={14} className="text-[var(--text-muted)]" />
          <span className="flex-1 text-sm text-[var(--text-primary)] truncate">{doc.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget({ type: 'doc', id: doc.id, name: doc.title });
            }}
            aria-label="Delete document"
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent-danger)]"
          >
            <Trash2 size={12} />
          </button>
        </div>
      );
    });
  }

  const handleSave = useCallback(async () => {
    if (!activeDocument || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/documents/${activeDocument.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editedTitle,
          content: editedContent,
        }),
      });
      const updated = await res.json();
      setActiveDocument(updated);
      setDocuments((prev) => prev.map((doc) => (doc.id === updated.id ? updated : doc)));
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setIsSaving(false);
    }
  }, [activeDocument, editedTitle, editedContent, isSaving]);

  function handleTitleChange(value: string) {
    setEditedTitle(value);
    setHasChanges(true);
  }

  const selectDocument = useCallback(async (doc: Document) => {
    if (doc.id === selectedDocId) return;
    if (hasChanges) {
      const confirmSwitch = confirm('You have unsaved changes. Switch documents anyway?');
      if (!confirmSwitch) return;
    }
    setSelectedFolderId(doc.folderId ?? null);
    setSelectedDocId(doc.id);
    await fetchDocument(doc.id);
  }, [fetchDocument, hasChanges, selectedDocId]);

  useEffect(() => {
    if (!requestedDocId || documents.length === 0) return;
    if (selectedDocId === requestedDocId) return;
    const doc = documents.find((item) => item.id === requestedDocId);
    if (doc) {
      selectDocument(doc);
    }
  }, [documents, requestedDocId, selectDocument, selectedDocId]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges) handleSave();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, handleSave]);

  useEffect(() => {
    if (!autoSaveEnabled || !activeDocument || !hasChanges) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 1200);
    return () => clearTimeout(timer);
  }, [autoSaveEnabled, activeDocument, editedTitle, editedContent, hasChanges, handleSave]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar - Folder Tree */}
      <div className="w-64 flex-shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-secondary)] flex flex-col">
        <div className="p-4 border-b border-[var(--border-default)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Documents</h2>
        </div>
        <div className="px-3 py-3 border-b border-[var(--border-default)] space-y-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".md,text/markdown"
            multiple
            className="hidden"
            onChange={handleImportMarkdownFiles}
            data-testid="markdown-import-input"
            aria-label="Import markdown files"
          />
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Search</p>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                placeholder="Search documents..."
                aria-label="Search documents"
                className={cn(
                  'w-full pl-8 pr-8 py-1.5 rounded-lg text-sm',
                  'bg-[var(--bg-tertiary)] border border-[var(--border-default)]',
                  'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
                  'focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]',
                  'transition-colors'
                )}
              />
              {docSearchQuery && (
                <button
                  onClick={() => setDocSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setFolderForm({ name: '', parentId: null });
                setIsFolderModalOpen(true);
              }}
            >
              <FolderPlus size={16} />
              Create Folder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={handleCreateDocumentInline}
            >
              <FilePlus2 size={16} />
              New Document
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => importInputRef.current?.click()}
              disabled={isImporting}
            >
              <Upload size={16} />
              {isImporting ? 'Importing Markdown...' : 'Import Markdown'}
            </Button>
          </div>
          {docSearchQuery && (
            <div
              className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)]"
              data-testid="doc-search-results"
            >
              {docSearchResults.length === 0 ? (
                <div className="px-3 py-2 text-xs text-[var(--text-muted)]">
                  No documents found.
                </div>
              ) : (
                docSearchResults.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      selectDocument(doc);
                      setDocSearchQuery('');
                    }}
                    className="w-full text-left px-3 py-2 border-b border-[var(--border-default)] last:border-b-0 hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={12} className="text-[var(--text-muted)]" />
                      <span className="text-sm text-[var(--text-primary)] truncate">{doc.title}</span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] truncate">
                      {getFolderPath(doc.folderId)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div className="flex-1 p-2 overflow-y-auto">
          {/* Root level */}
          <button
            onClick={() => setSelectedFolderId(null)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left',
              selectedFolderId === null ? 'bg-[var(--bg-elevated)]' : 'hover:bg-[var(--bg-elevated)]',
              dragOverFolderId === null && canDropIntoFolder(null) && 'bg-[var(--accent-primary)]/15 ring-1 ring-[var(--accent-primary)]'
            )}
            onDragOver={(event) => handleDropZoneDragOver(event, null)}
            onDrop={(event) => void handleDropZoneDrop(event, null)}
          >
            <FileText size={16} className="text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-primary)]">All Documents</span>
          </button>

          <div className="mt-1">
            {renderFolderTree(null)}
          </div>

          <div className="mt-2">
            {renderDocumentItems(null, 1)}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {uiNotice && (
          <div className="px-6 pt-3">
            <div
              role="status"
              className={cn(
                'flex items-center justify-between rounded-xl border px-3 py-2 text-sm',
                uiNotice.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-300'
              )}
            >
              <span className="flex items-center gap-2">
                {uiNotice.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                {uiNotice.message}
              </span>
              <button
                type="button"
                aria-label="Dismiss notice"
                className="rounded p-1 opacity-80 hover:opacity-100"
                onClick={() => setUiNotice(null)}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
        {!activeDocument ? (
          <div className="flex-1 p-8 overflow-y-auto">
            <EmptyState
              icon={FileText}
              title="Select a document"
              description="Choose a document from the left to start editing"
            />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-3 group">
                <input
                  value={editedTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-xl font-bold bg-transparent text-[var(--text-primary)] w-full max-w-[420px] focus-visible:outline-none"
                />
                <Pencil size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                {hasChanges && (
                  <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded">
                    Unsaved changes
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)] mr-2">
                  {isSaving ? 'Saving...' : `Last saved ${formatDateTime(activeDocument.updatedAt)}`}
                </span>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleExportMarkdown}
                  className={cn(
                    'border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/8',
                    'text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/16 hover:text-[var(--accent-primary)]'
                  )}
                >
                  <FileDown size={16} />
                  Export .md
                </Button>

                <button
                  onClick={() => setDeleteTarget({ type: 'doc', id: activeDocument.id, name: activeDocument.title })}
                  aria-label="Delete document"
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            {/* Editor/Preview */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full tiptap-editor">
                {editor && <EditorContent editor={editor} className="h-full" />}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Folder Modal */}
      <Modal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        title="Create Folder"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <Input
            label="Folder Name"
            placeholder="Enter folder name"
            value={folderForm.name}
            onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
            required
          />
          <Select
            label="Location"
            value={folderForm.parentId ?? 'root'}
            onChange={(e) => setFolderForm({ ...folderForm, parentId: e.target.value === 'root' ? null : e.target.value })}
            options={[
              { value: 'root', label: 'Root' },
              ...buildFolderOptions(null),
            ]}
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsFolderModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal
        isOpen={!!renameFolderTarget}
        onClose={() => {
          if (isRenamingFolder) return;
          setRenameFolderTarget(null);
          setRenamedFolderName('');
        }}
        title="Rename Folder"
      >
        <form onSubmit={handleRenameFolder} className="space-y-4">
          <Input
            label="Folder Name"
            value={renamedFolderName}
            onChange={(e) => setRenamedFolderName(e.target.value)}
            placeholder="Enter folder name"
            autoFocus
            required
          />
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setRenameFolderTarget(null);
                setRenamedFolderName('');
              }}
              className="flex-1"
              disabled={isRenamingFolder}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isRenamingFolder || !renamedFolderName.trim()}
            >
              {isRenamingFolder ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.type === 'folder' ? 'Delete folder' : 'Delete document'}
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            {deleteTarget?.type === 'folder'
              ? `Delete "${deleteTarget?.name}" and all its contents? This action cannot be undone.`
              : `Delete "${deleteTarget?.name}"? This action cannot be undone.`}
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!deleteTarget) return;
                const { type, id } = deleteTarget;
                setDeleteTarget(null);
                if (type === 'doc') {
                  await deleteDocumentById(id);
                } else {
                  await deleteFolderById(id);
                }
              }}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
