import { NextRequest, NextResponse } from 'next/server';
import { getMembers, createMember } from '@/lib/storage/members-storage';

export async function GET() {
  try {
    const members = await getMembers();
    return NextResponse.json(members);
  } catch (error) {
    console.error('Failed to get members:', error);
    return NextResponse.json({ error: 'Failed to get members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const member = await createMember(body);
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Failed to create member:', error);
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
  }
}
