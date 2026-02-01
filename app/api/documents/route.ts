import { NextRequest, NextResponse } from 'next/server';
import { getDocuments, createDocument } from '@/lib/storage/documents-storage';

export async function GET() {
  try {
    const documents = await getDocuments();
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Failed to get documents:', error);
    return NextResponse.json({ error: 'Failed to get documents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const document = await createDocument(body);
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Failed to create document:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
