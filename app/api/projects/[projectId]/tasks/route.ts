import { NextRequest, NextResponse } from 'next/server';
import { getTasks, createTask, reorderTasks } from '@/lib/storage/tasks-storage';

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { projectId } = await params;
    const tasks = await getTasks(projectId);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Failed to get tasks:', error);
    return NextResponse.json({ error: 'Failed to get tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const task = await createTask(projectId, body);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    // Handle reordering
    if (body.reorder) {
      await reorderTasks(projectId, body.taskIds, body.status);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Failed to reorder tasks:', error);
    return NextResponse.json({ error: 'Failed to reorder tasks' }, { status: 500 });
  }
}
