'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { Plus, FileText, Folder, ChevronRight, ChevronDown, Trash2, Pencil, Search, X } from 'lucide-react';
import { Button, Modal, Input, EmptyState, Select, Badge } from '@/components/ui';
import type { Document, Folder as FolderType, CreateFolderInput } from '@/types';
import { cn } from '@/lib/utils/cn';
import { formatDateTime } from '@/lib/utils/date';

export default function DocsPage() {
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
  const isSyncingRef = useRef(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'doc' | 'folder';
    id: string;
    name: string;
  } | null>(null);

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

  async function fetchDocument(docId: string) {
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
  }

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
      const siblings = documents.filter((doc) => doc.folderId === selectedFolderId);
      const baseTitle = 'Untitled';
      let title = baseTitle;
      let counter = 1;
      while (siblings.some((doc) => doc.title === title)) {
        counter += 1;
        title = `${baseTitle} ${counter}`;
      }
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: '',
          folderId: selectedFolderId,
        }),
      });
      const newDoc = await res.json();
      setDocuments([newDoc, ...documents]);
      setSelectedDocId(newDoc.id);
      fetchDocument(newDoc.id);
    } catch (error) {
      console.error('Failed to create document:', error);
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
    return folders.filter((f) => f.parentId === parentId).sort((a, b) => a.order - b.order);
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

      return (
        <div key={folder.id}>
          <div
            className={cn(
              'group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
              isSelected ? 'bg-[var(--bg-elevated)]' : 'hover:bg-[var(--bg-elevated)]'
            )}
            style={{ paddingLeft: `${8 + level * 16}px` }}
            onClick={() => {
              setSelectedFolderId(folder.id);
              if (hasChildren) toggleFolder(folder.id);
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
              className="p-0.5 text-[var(--text-muted)]"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <Folder size={16} className="text-[var(--text-muted)]" />
            <span className="flex-1 text-sm text-[var(--text-primary)] truncate">{folder.name}</span>
            <Badge className="text-[10px]">{docCount}</Badge>
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

  async function selectDocument(doc: Document) {
    if (doc.id === selectedDocId) return;
    if (hasChanges) {
      const confirmSwitch = confirm('You have unsaved changes. Switch documents anyway?');
      if (!confirmSwitch) return;
    }
    setSelectedFolderId(doc.folderId ?? null);
    setSelectedDocId(doc.id);
    await fetchDocument(doc.id);
  }

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
        <div className="flex-1 p-2 overflow-y-auto">
          {/* Root level */}
          <button
            onClick={() => setSelectedFolderId(null)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left',
              selectedFolderId === null ? 'bg-[var(--bg-elevated)]' : 'hover:bg-[var(--bg-elevated)]'
            )}
          >
            <FileText size={16} className="text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-primary)]">All Documents</span>
          </button>

          <div className="mt-1">
            {renderDocumentItems(null, 1)}
          </div>

          <div className="mt-2">
            {renderFolderTree(null)}
          </div>
        </div>
        <div className="p-2 border-t border-[var(--border-default)]">
          <div className="mb-3">
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

            {docSearchQuery && (
              <div
                className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)]"
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
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start"
              onClick={() => {
                setFolderForm({ name: '', parentId: null });
                setIsFolderModalOpen(true);
              }}
            >
              <Plus size={16} />
              New Folder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start"
              onClick={handleCreateDocumentInline}
            >
              <Plus size={16} />
              New Doc
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
