'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, Folder, ChevronRight, ChevronDown, Trash2, Pencil, Upload } from 'lucide-react';
import { Button, Modal, Input, EmptyState } from '@/components/ui';
import type { Document, Folder as FolderType, CreateDocumentInput, CreateFolderInput } from '@/types';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/date';
import Link from 'next/link';

export default function DocsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Modal states
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [docForm, setDocForm] = useState<CreateDocumentInput>({ title: '', content: '' });
  const [folderForm, setFolderForm] = useState<CreateFolderInput>({ name: '' });

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

  async function handleCreateDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!docForm.title.trim()) return;

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...docForm,
          folderId: selectedFolderId,
        }),
      });
      const newDoc = await res.json();
      setDocuments([newDoc, ...documents]);
      setIsDocModalOpen(false);
      setDocForm({ title: '', content: '' });
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
          parentId: selectedFolderId,
        }),
      });
      const newFolder = await res.json();
      setFolders([...folders, newFolder]);
      setIsFolderModalOpen(false);
      setFolderForm({ name: '' });
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  }

  async function handleDeleteDocument(id: string) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      setDocuments(documents.filter((d) => d.id !== id));
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  }

  async function handleDeleteFolder(id: string) {
    if (!confirm('Are you sure you want to delete this folder and all its contents?')) return;

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

  function renderFolderTree(parentId: string | null, level: number = 0): React.ReactNode {
    const childFolders = getChildFolders(parentId);

    return childFolders.map((folder) => {
      const isExpanded = expandedFolders.has(folder.id);
      const isSelected = selectedFolderId === folder.id;
      const hasChildren = getChildFolders(folder.id).length > 0 || getDocumentsInFolder(folder.id).length > 0;

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
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent-danger)]"
            >
              <Trash2 size={12} />
            </button>
          </div>
          {isExpanded && renderFolderTree(folder.id, level + 1)}
        </div>
      );
    });
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]" />
      </div>
    );
  }

  const currentDocs = getDocumentsInFolder(selectedFolderId);
  const currentFolder = folders.find((f) => f.id === selectedFolderId);

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

          <div className="mt-2">
            {renderFolderTree(null)}
          </div>
        </div>
        <div className="p-2 border-t border-[var(--border-default)]">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setIsFolderModalOpen(true)}
          >
            <Plus size={16} />
            New Folder
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {currentFolder ? currentFolder.name : 'All Documents'}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {currentDocs.length} document{currentDocs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setIsDocModalOpen(true)}>
            <Plus size={18} />
            New Document
          </Button>
        </div>

        {/* Documents Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          {currentDocs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents"
              description={selectedFolderId ? "This folder is empty" : "Create your first document"}
              action={
                <Button onClick={() => setIsDocModalOpen(true)}>
                  <Plus size={18} />
                  Create Document
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/docs/${doc.id}`}
                  className="group p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-[var(--bg-elevated)]">
                      <FileText size={20} className="text-[var(--accent-primary)]" />
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); handleDeleteDocument(doc.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--bg-elevated)] transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h3 className="font-medium text-[var(--text-primary)] mb-1 truncate group-hover:text-[var(--accent-primary)] transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Updated {formatDate(doc.updatedAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Document Modal */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title="Create Document"
      >
        <form onSubmit={handleCreateDocument} className="space-y-4">
          <Input
            label="Title"
            placeholder="Document title"
            value={docForm.title}
            onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
            required
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsDocModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create
            </Button>
          </div>
        </form>
      </Modal>

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
    </div>
  );
}
