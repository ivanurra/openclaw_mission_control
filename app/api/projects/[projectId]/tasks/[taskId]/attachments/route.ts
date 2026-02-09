import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { ensureDir } from '@/lib/storage/file-system';
import { generateId } from '@/lib/utils/id';
import { toISOString } from '@/lib/utils/date';
import { getTask, updateTask, getTaskAttachmentsDir, getTaskAttachmentPath } from '@/lib/storage/tasks-storage';
import type { TaskAttachment } from '@/types';

export const runtime = 'nodejs';

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string; taskId: string }> }) {
  try {
    const { projectId, taskId } = await params;
    const task = await getTask(projectId, taskId);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files').filter((file) => file instanceof File) as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const attachmentsDir = getTaskAttachmentsDir(projectId, taskId);
    await ensureDir(attachmentsDir);

    const newAttachments: TaskAttachment[] = [];

    for (const file of files) {
      const attachmentId = generateId();
      const sanitized = sanitizeFileName(file.name || 'attachment');
      const ext = path.extname(sanitized);
      const storageName = `${attachmentId}${ext}`;
      const filePath = getTaskAttachmentPath(projectId, taskId, storageName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      newAttachments.push({
        id: attachmentId,
        name: file.name || sanitized,
        size: file.size,
        type: file.type,
        createdAt: toISOString(),
        storageName,
        source: 'upload',
      });
    }

    const updated = await updateTask(projectId, taskId, {
      attachments: [...task.attachments, ...newAttachments],
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to upload attachment:', error);
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
  }
}
