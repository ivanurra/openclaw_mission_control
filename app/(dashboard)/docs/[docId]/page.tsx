'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Save, Eye, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button, Input } from '@/components/ui';
import type { Document } from '@/types';
import { cn } from '@/lib/utils/cn';
import { formatDateTime } from '@/lib/utils/date';

// Dynamic import for markdown editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface Props {
  params: Promise<{ docId: string }>;
}

export default function DocumentEditorPage({ params }: Props) {
  const { docId } = use(params);
  const router = useRouter();

  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    fetchDocument();
  }, [docId]);

  async function fetchDocument() {
    try {
      const res = await fetch(`/api/documents/${docId}`);
      if (!res.ok) {
        router.push('/docs');
        return;
      }
      const data = await res.json();
      setDocument(data);
      setEditedTitle(data.title);
      setEditedContent(data.content);
    } catch (error) {
      console.error('Failed to fetch document:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSave = useCallback(async () => {
    if (!document || isSaving) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editedTitle,
          content: editedContent,
        }),
      });
      const updated = await res.json();
      setDocument(updated);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setIsSaving(false);
    }
  }, [document, docId, editedTitle, editedContent, isSaving]);

  // Keyboard shortcut for saving
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

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      router.push('/docs');
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  }

  function handleContentChange(value: string | undefined) {
    setEditedContent(value || '');
    setHasChanges(true);
  }

  function handleTitleChange(value: string) {
    setEditedTitle(value);
    setHasChanges(true);
    setIsEditing(false);
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]" />
      </div>
    );
  }

  if (!document) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-4">
          <Link
            href="/docs"
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>

          {isEditing ? (
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={() => handleTitleChange(editedTitle)}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleChange(editedTitle)}
              className="text-xl font-bold"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 group"
            >
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                {editedTitle}
              </h1>
              <Pencil
                size={14}
                className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </button>
          )}

          {hasChanges && (
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] mr-2">
            Last saved {formatDateTime(document.updatedAt)}
          </span>

          {/* View mode toggle */}
          <div className="flex rounded-lg border border-[var(--border-default)] overflow-hidden">
            <button
              onClick={() => setViewMode('edit')}
              className={cn(
                'px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors',
                viewMode === 'edit'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={cn(
                'px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors',
                viewMode === 'preview'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              <Eye size={14} />
              Preview
            </button>
          </div>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>

          <button
            onClick={handleDelete}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'edit' ? (
          <div className="h-full" data-color-mode="dark">
            <MDEditor
              value={editedContent}
              onChange={handleContentChange}
              height="100%"
              preview="edit"
              hideToolbar={false}
              style={{
                backgroundColor: 'var(--bg-primary)',
              }}
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-8">
            <article className="prose prose-invert max-w-4xl mx-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {editedContent || '*No content yet*'}
              </ReactMarkdown>
            </article>
          </div>
        )}
      </div>
    </div>
  );
}
