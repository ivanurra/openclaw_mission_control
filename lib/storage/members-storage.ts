import path from 'path';
import { readJsonFile, writeJsonFile, DATA_DIR } from './file-system';
import type { Member, CreateMemberInput } from '@/types';
import { generateId } from '@/lib/utils/id';
import { toISOString } from '@/lib/utils/date';
import { MEMBER_COLORS } from '@/lib/constants/kanban';

const MEMBERS_FILE = path.join(DATA_DIR, 'members', 'members.json');

export async function getMembers(): Promise<Member[]> {
  const members = await readJsonFile<Member[]>(MEMBERS_FILE);
  return members || [];
}

export async function getMember(id: string): Promise<Member | null> {
  const members = await getMembers();
  return members.find(m => m.id === id) || null;
}

export async function createMember(input: CreateMemberInput): Promise<Member> {
  const members = await getMembers();

  const member: Member = {
    id: generateId(),
    name: input.name,
    description: input.description,
    role: input.role,
    llmModel: input.llmModel,
    color: input.color || MEMBER_COLORS[members.length % MEMBER_COLORS.length],
    projectIds: [],
    createdAt: toISOString(),
  };

  members.push(member);
  await writeJsonFile(MEMBERS_FILE, members);

  return member;
}

export async function updateMember(id: string, updates: Partial<Member>): Promise<Member | null> {
  const members = await getMembers();
  const index = members.findIndex(m => m.id === id);

  if (index === -1) return null;

  members[index] = { ...members[index], ...updates };
  await writeJsonFile(MEMBERS_FILE, members);

  return members[index];
}

export async function deleteMember(id: string): Promise<boolean> {
  const members = await getMembers();
  const filtered = members.filter(m => m.id !== id);

  if (filtered.length === members.length) return false;

  await writeJsonFile(MEMBERS_FILE, filtered);
  return true;
}

export async function addMemberToProject(memberId: string, projectId: string): Promise<void> {
  const members = await getMembers();
  const member = members.find(m => m.id === memberId);

  if (member && !member.projectIds.includes(projectId)) {
    member.projectIds.push(projectId);
    await writeJsonFile(MEMBERS_FILE, members);
  }
}

export async function removeMemberFromProject(memberId: string, projectId: string): Promise<void> {
  const members = await getMembers();
  const member = members.find(m => m.id === memberId);

  if (member) {
    member.projectIds = member.projectIds.filter(id => id !== projectId);
    await writeJsonFile(MEMBERS_FILE, members);
  }
}
