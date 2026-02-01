import { NextRequest, NextResponse } from 'next/server';
import { getFolder, updateFolder, deleteFolder } from '@/lib/storage/documents-storage';

interface Params {
  params: Promise<{ folderId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { folderId } = await params;
    const folder = await getFolder(folderId);
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    return NextResponse.json(folder);
  } catch (error) {
    console.error('Failed to get folder:', error);
    return NextResponse.json({ error: 'Failed to get folder' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { folderId } = await params;
    const body = await request.json();
    const folder = await updateFolder(folderId, body);
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    return NextResponse.json(folder);
  } catch (error) {
    console.error('Failed to update folder:', error);
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { folderId } = await params;
    await deleteFolder(folderId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
