import { NextRequest, NextResponse } from 'next/server';
import { getProjects } from '@/lib/storage/projects-storage';
import { getTasks } from '@/lib/storage/tasks-storage';
import { getScheduledTasks } from '@/lib/storage/scheduled-storage';

interface Params {
  params: Promise<{ memberId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { memberId } = await params;

    const assignedTasks: {
      taskId: string;
      taskTitle: string;
      status: string;
      projectId: string;
      projectName: string;
      source: 'project' | 'scheduled';
    }[] = [];

    // Project tasks
    const projects = await getProjects();
    for (const project of projects) {
      const tasks = await getTasks(project.slug);
      for (const task of tasks) {
        if (task.assignedMemberId === memberId) {
          assignedTasks.push({
            taskId: task.id,
            taskTitle: task.title,
            status: task.status,
            projectId: project.slug,
            projectName: project.name,
            source: 'project',
          });
        }
      }
    }

    // Scheduled tasks
    const scheduledTasks = await getScheduledTasks();
    for (const task of scheduledTasks) {
      if (task.assignedMemberId === memberId) {
        assignedTasks.push({
          taskId: task.id,
          taskTitle: task.title,
          status: 'recurring',
          projectId: '',
          projectName: `${task.dayOfWeek.charAt(0).toUpperCase()}${task.dayOfWeek.slice(1)} at ${task.time}`,
          source: 'scheduled',
        });
      }
    }

    return NextResponse.json(assignedTasks);
  } catch (error) {
    console.error('Failed to get member activity:', error);
    return NextResponse.json({ error: 'Failed to get member activity' }, { status: 500 });
  }
}
