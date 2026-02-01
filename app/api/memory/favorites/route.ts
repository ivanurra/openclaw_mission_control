import { NextRequest, NextResponse } from 'next/server';
import { getFavorites, toggleFavorite } from '@/lib/storage/memory-storage';

export async function GET() {
  try {
    const favorites = await getFavorites();
    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Failed to get favorites:', error);
    return NextResponse.json({ error: 'Failed to get favorites' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const favorites = await toggleFavorite(date);
    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    return NextResponse.json({ error: 'Failed to toggle favorite' }, { status: 500 });
  }
}
