import { NextRequest, NextResponse } from 'next/server';
import { getMember, updateMember, deleteMember } from '@/lib/storage/members-storage';

interface Params {
  params: Promise<{ memberId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { memberId } = await params;
    const member = await getMember(memberId);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    return NextResponse.json(member);
  } catch (error) {
    console.error('Failed to get member:', error);
    return NextResponse.json({ error: 'Failed to get member' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { memberId } = await params;
    const body = await request.json();
    const member = await updateMember(memberId, body);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    return NextResponse.json(member);
  } catch (error) {
    console.error('Failed to update member:', error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { memberId } = await params;
    const success = await deleteMember(memberId);
    if (!success) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete member:', error);
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 });
  }
}
