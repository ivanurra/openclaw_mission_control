import { NextRequest, NextResponse } from 'next/server';
import { getDevelopers, createDeveloper } from '@/lib/storage/developers-storage';

export async function GET() {
  try {
    const developers = await getDevelopers();
    return NextResponse.json(developers);
  } catch (error) {
    console.error('Failed to get developers:', error);
    return NextResponse.json({ error: 'Failed to get developers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const developer = await createDeveloper(body);
    return NextResponse.json(developer, { status: 201 });
  } catch (error) {
    console.error('Failed to create developer:', error);
    return NextResponse.json({ error: 'Failed to create developer' }, { status: 500 });
  }
}
