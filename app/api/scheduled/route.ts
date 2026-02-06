import { NextRequest, NextResponse } from 'next/server';
import { getScheduledTasks, createScheduledTask } from '@/lib/storage/scheduled-storage';

export async function GET() {
  try {
    const tasks = await getScheduledTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Failed to get scheduled tasks:', error);
    return NextResponse.json({ error: 'Failed to get scheduled tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const task = await createScheduledTask(body);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Failed to create scheduled task:', error);
    return NextResponse.json({ error: 'Failed to create scheduled task' }, { status: 500 });
  }
}
