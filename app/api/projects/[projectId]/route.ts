import { NextRequest, NextResponse } from 'next/server';
import { getProjectBySlug, updateProject, deleteProject, getProject } from '@/lib/storage/projects-storage';

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { projectId } = await params;
    // Try to get by slug first, then by id
    let project = await getProjectBySlug(projectId);
    if (!project) {
      project = await getProject(projectId);
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    console.error('Failed to get project:', error);
    return NextResponse.json({ error: 'Failed to get project' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    // Get project by slug to find its ID
    const existingProject = await getProjectBySlug(projectId);
    const id = existingProject?.id || projectId;

    const project = await updateProject(id, body);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    console.error('Failed to update project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { projectId } = await params;

    // Get project by slug to find its ID
    const existingProject = await getProjectBySlug(projectId);
    const id = existingProject?.id || projectId;

    const success = await deleteProject(id);
    if (!success) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
