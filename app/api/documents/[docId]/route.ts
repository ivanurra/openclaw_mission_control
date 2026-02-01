import { NextRequest, NextResponse } from 'next/server';
import { getDocument, updateDocument, deleteDocument } from '@/lib/storage/documents-storage';

interface Params {
  params: Promise<{ docId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { docId } = await params;
    const document = await getDocument(docId);
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json(document);
  } catch (error) {
    console.error('Failed to get document:', error);
    return NextResponse.json({ error: 'Failed to get document' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { docId } = await params;
    const body = await request.json();
    const document = await updateDocument(docId, body);
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json(document);
  } catch (error) {
    console.error('Failed to update document:', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { docId } = await params;
    const success = await deleteDocument(docId);
    if (!success) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
