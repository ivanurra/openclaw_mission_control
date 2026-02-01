import { NextRequest, NextResponse } from 'next/server';
import { getFolders, createFolder } from '@/lib/storage/documents-storage';

export async function GET() {
  try {
    const folders = await getFolders();
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Failed to get folders:', error);
    return NextResponse.json({ error: 'Failed to get folders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const folder = await createFolder(body);
    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error('Failed to create folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
