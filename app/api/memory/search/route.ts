import { NextRequest, NextResponse } from 'next/server';
import { searchConversations } from '@/lib/storage/memory-storage';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get('q');

  if (!keyword) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    const results = await searchConversations(keyword);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Failed to search conversations:', error);
    return NextResponse.json({ error: 'Failed to search conversations' }, { status: 500 });
  }
}
