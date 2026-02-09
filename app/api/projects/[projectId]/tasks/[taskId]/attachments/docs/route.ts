import { NextRequest, NextResponse } from 'next/server';
import { getTask, updateTask } from '@/lib/storage/tasks-storage';
import { getDocuments } from '@/lib/storage/documents-storage';
import { generateId } from '@/lib/utils/id';
import { toISOString } from '@/lib/utils/date';
import type { TaskAttachment } from '@/types';

interface Params {
  params: Promise<{ projectId: string; taskId: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { projectId, taskId } = await params;
    const task = await getTask(projectId, taskId);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = await request.json() as { documentIds?: unknown };
    const requestedDocumentIds = Array.isArray(body?.documentIds)
      ? body.documentIds.filter((value: unknown): value is string => typeof value === 'string')
      : [];

    if (requestedDocumentIds.length === 0) {
      return NextResponse.json({ error: 'No documents provided' }, { status: 400 });
    }

    const documents = await getDocuments();
    const documentsById = new Map(documents.map((doc) => [doc.id, doc]));
    const uniqueRequestedIds = Array.from(new Set(requestedDocumentIds));
    const existingLinkedIds = new Set(
      task.attachments
        .filter((attachment) => attachment.documentId)
        .map((attachment) => attachment.documentId as string)
    );

    const now = toISOString();
    const newAttachments: TaskAttachment[] = [];

    for (const documentId of uniqueRequestedIds) {
      const document = documentsById.get(documentId);
      if (!document || existingLinkedIds.has(documentId)) {
        continue;
      }

      newAttachments.push({
        id: generateId(),
        name: document.title,
        size: Buffer.byteLength(document.content || '', 'utf8'),
        type: 'application/x-openclaw-doc-link',
        createdAt: now,
        source: 'docs',
        documentId: document.id,
      });
    }

    if (newAttachments.length === 0) {
      return NextResponse.json(task);
    }

    const updatedLinkedDocumentIds = [...task.linkedDocumentIds];
    for (const attachment of newAttachments) {
      if (attachment.documentId && !updatedLinkedDocumentIds.includes(attachment.documentId)) {
        updatedLinkedDocumentIds.push(attachment.documentId);
      }
    }

    const updated = await updateTask(projectId, taskId, {
      attachments: [...task.attachments, ...newAttachments],
      linkedDocumentIds: updatedLinkedDocumentIds,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to link documents as attachments:', error);
    return NextResponse.json({ error: 'Failed to link documents' }, { status: 500 });
  }
}
