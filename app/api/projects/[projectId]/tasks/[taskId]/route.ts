import { NextRequest, NextResponse } from 'next/server';
import { getTask, updateTask, deleteTask } from '@/lib/storage/tasks-storage';

interface Params {
  params: Promise<{ projectId: string; taskId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { projectId, taskId } = await params;
    const task = await getTask(projectId, taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (error) {
    console.error('Failed to get task:', error);
    return NextResponse.json({ error: 'Failed to get task' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { projectId, taskId } = await params;
    const body = await request.json();
    const task = await updateTask(projectId, taskId, body);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { projectId, taskId } = await params;
    await deleteTask(projectId, taskId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
