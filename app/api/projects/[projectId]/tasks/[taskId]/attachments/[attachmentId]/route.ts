import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import {
  getTask,
  updateTask,
  getTaskAttachmentPath,
} from '@/lib/storage/tasks-storage';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string; attachmentId: string }> }
) {
  try {
    const { projectId, taskId, attachmentId } = await params;
    const task = await getTask(projectId, taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const attachment = task.attachments.find((item) => item.id === attachmentId);
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    if (attachment.documentId) {
      const redirectUrl = new URL(`/docs/${attachment.documentId}`, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    const storageName = attachment.storageName || attachment.id;
    const filePath = getTaskAttachmentPath(projectId, taskId, storageName);
    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.name)}"`,
      },
    });
  } catch (error) {
    console.error('Failed to download attachment:', error);
    return NextResponse.json({ error: 'Failed to download attachment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string; attachmentId: string }> }
) {
  try {
    const { projectId, taskId, attachmentId } = await params;
    const task = await getTask(projectId, taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const attachment = task.attachments.find((item) => item.id === attachmentId);
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    if (!attachment.documentId) {
      const storageName = attachment.storageName || attachment.id;
      const filePath = getTaskAttachmentPath(projectId, taskId, storageName);
      try {
        await fs.unlink(filePath);
      } catch {
        // ignore missing file
      }
    }

    const remaining = task.attachments.filter((item) => item.id !== attachmentId);
    const updatedLinkedDocumentIds = attachment.documentId
      && !remaining.some((item) => item.documentId === attachment.documentId)
      ? task.linkedDocumentIds.filter((docId) => docId !== attachment.documentId)
      : task.linkedDocumentIds;
    const updated = await updateTask(projectId, taskId, {
      attachments: remaining,
      linkedDocumentIds: updatedLinkedDocumentIds,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to delete attachment:', error);
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}
