import { NextRequest, NextResponse } from 'next/server';
import { getProjects, createProject } from '@/lib/storage/projects-storage';

export async function GET() {
  try {
    const projects = await getProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to get projects:', error);
    return NextResponse.json({ error: 'Failed to get projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const project = await createProject(body);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
