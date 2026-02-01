import { NextRequest, NextResponse } from 'next/server';
import { getDeveloper, updateDeveloper, deleteDeveloper } from '@/lib/storage/developers-storage';

interface Params {
  params: Promise<{ developerId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { developerId } = await params;
    const developer = await getDeveloper(developerId);
    if (!developer) {
      return NextResponse.json({ error: 'Developer not found' }, { status: 404 });
    }
    return NextResponse.json(developer);
  } catch (error) {
    console.error('Failed to get developer:', error);
    return NextResponse.json({ error: 'Failed to get developer' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { developerId } = await params;
    const body = await request.json();
    const developer = await updateDeveloper(developerId, body);
    if (!developer) {
      return NextResponse.json({ error: 'Developer not found' }, { status: 404 });
    }
    return NextResponse.json(developer);
  } catch (error) {
    console.error('Failed to update developer:', error);
    return NextResponse.json({ error: 'Failed to update developer' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { developerId } = await params;
    const success = await deleteDeveloper(developerId);
    if (!success) {
      return NextResponse.json({ error: 'Developer not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete developer:', error);
    return NextResponse.json({ error: 'Failed to delete developer' }, { status: 500 });
  }
}
