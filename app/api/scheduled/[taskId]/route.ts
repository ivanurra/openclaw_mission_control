import { NextRequest, NextResponse } from 'next/server';
import { updateScheduledTask, deleteScheduledTask } from '@/lib/storage/scheduled-storage';

interface Params {
  params: Promise<{ taskId: string }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const task = await updateScheduledTask(taskId, body);

    if (!task) {
      return NextResponse.json({ error: 'Scheduled task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Failed to update scheduled task:', error);
    return NextResponse.json({ error: 'Failed to update scheduled task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { taskId } = await params;
    const deleted = await deleteScheduledTask(taskId);

    if (!deleted) {
      return NextResponse.json({ error: 'Scheduled task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete scheduled task:', error);
    return NextResponse.json({ error: 'Failed to delete scheduled task' }, { status: 500 });
  }
}
