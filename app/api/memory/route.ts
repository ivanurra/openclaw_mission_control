import { NextRequest, NextResponse } from 'next/server';
import { getAvailableDates, getConversation } from '@/lib/storage/memory-storage';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date');

  try {
    if (date) {
      const conversation = await getConversation(date);
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      return NextResponse.json(conversation);
    }

    const dates = await getAvailableDates();
    return NextResponse.json({ dates });
  } catch (error) {
    console.error('Failed to get memory data:', error);
    return NextResponse.json({ error: 'Failed to get memory data' }, { status: 500 });
  }
}
