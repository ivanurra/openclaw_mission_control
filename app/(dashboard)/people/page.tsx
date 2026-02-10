'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Plus, Users, Trash2, Pencil, Settings, FileText } from 'lucide-react';
import { Button, Modal, Input, Textarea, EmptyState, Avatar } from '@/components/ui';
import type { Member, CreateMemberInput } from '@/types';
import { cn } from '@/lib/utils/cn';
import { MEMBER_COLORS } from '@/lib/constants/kanban';

interface AssignedTask {
  taskId: string;
  taskTitle: string;
  status: string;
  projectId: string;
  projectName: string;
  source: 'project' | 'scheduled';
}

const STATUS_COLORS: Record<string, { dot: string; text: string }> = {
  in_progress: { dot: 'bg-emerald-400', text: 'text-emerald-400/80' },
  todo: { dot: 'bg-blue-400', text: 'text-blue-400/80' },
  backlog: { dot: 'bg-zinc-400', text: 'text-zinc-400/80' },
  recurring: { dot: 'bg-amber-400', text: 'text-amber-400/80' },
  done: { dot: 'bg-zinc-600', text: 'text-zinc-500/80' },
};

type ModalTab = 'settings' | 'soul' | 'memory';

export default function PeoplePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasHandledQuery = useRef(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [activities, setActivities] = useState<Record<string, AssignedTask[]>>({});
  const [activeTab, setActiveTab] = useState<ModalTab>('settings');
  const [formData, setFormData] = useState<CreateMemberInput>({
    name: '',
    role: '',
    description: '',
    color: MEMBER_COLORS[0],
    llmModel: '',
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      setMembers(data);
      fetchActivities(data);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchActivities(memberList: Member[]) {
    const results: Record<string, AssignedTask[]> = {};
    await Promise.all(
      memberList.map(async (m) => {
        try {
          const res = await fetch(`/api/members/${m.id}/activity`);
          const data = await res.json();
          results[m.id] = Array.isArray(data) ? data : [];
        } catch {
          results[m.id] = [];
        }
      })
    );
    setActivities(results);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingMember) {
        const res = await fetch(`/api/members/${editingMember.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const updated = await res.json();
        setMembers(members.map(m => m.id === updated.id ? updated : m));
        setEditingMember(updated);
      } else {
        const res = await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const newMember = await res.json();
        setMembers([...members, newMember]);
        closeModal();
      }
    } catch (error) {
      console.error('Failed to save member:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this crew member?')) return;

    try {
      await fetch(`/api/members/${id}`, { method: 'DELETE' });
      setMembers(members.filter(m => m.id !== id));
      if (editingMember?.id === id) {
        closeModal();
      }
    } catch (error) {
      console.error('Failed to delete member:', error);
    }
  }

  const openModal = useCallback((member: Member | null, tab: ModalTab = 'settings') => {
    setEditingMember(member);
    setActiveTab(tab);
    setFormData({
      name: member?.name || '',
      role: member?.role || '',
      description: member?.description || '',
      color: member?.color || MEMBER_COLORS[members.length % MEMBER_COLORS.length],
      llmModel: member?.llmModel || '',
    });
    setIsModalOpen(true);
  }, [members.length]);

  function closeModal() {
    setIsModalOpen(false);
    setEditingMember(null);
    setActiveTab('settings');
    setFormData({
      name: '',
      role: '',
      description: '',
      color: MEMBER_COLORS[members.length % MEMBER_COLORS.length],
      llmModel: '',
    });
  }

  useEffect(() => {
    if (hasHandledQuery.current) return;
    const memberId = searchParams.get('member');
    if (!memberId || members.length === 0) return;

    const member = members.find((m) => m.id === memberId);
    if (member) {
      openModal(member);
      hasHandledQuery.current = true;
      router.replace('/people');
    }
  }, [members, openModal, router, searchParams]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Crew</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {members.length} crew member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => openModal(null)}>
          <Plus size={18} />
          Add Member
        </Button>
      </div>

      {/* Members grid */}
      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No crew members yet"
          description="Add crew members to assign them to projects and tasks"
          action={
            <Button onClick={() => openModal(null)}>
              <Plus size={18} />
              Add Member
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {members.map((member) => {
            const tasks = activities[member.id] || [];
            return (
              <div
                key={member.id}
                className="rounded-xl bg-[var(--bg-secondary)] border-l-4 border border-[var(--border-default)] group relative overflow-hidden cursor-pointer hover:border-[var(--border-strong)] transition-colors"
                style={{ borderLeftColor: member.color }}
                onClick={() => openModal(member)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={member.name} color={member.color} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--text-primary)] truncate">
                          {member.name}
                        </h3>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: member.color }}
                        />
                      </div>
                      {member.role && (
                        <p className="text-sm text-[var(--text-secondary)] truncate">
                          {member.role}
                        </p>
                      )}
                    </div>
                  </div>

                  {member.description && (
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-3">
                      {member.description}
                    </p>
                  )}

                  {member.llmModel && (
                    <div className="mt-3 px-3 py-2 rounded-lg bg-[var(--bg-elevated)]">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
                        LLM Model
                      </p>
                      <p className="text-xs font-mono text-[var(--text-secondary)]">
                        {member.llmModel}
                      </p>
                    </div>
                  )}

                  {tasks.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                        Assigned tasks
                      </p>
                      {tasks.map((task) => {
                        const colors = STATUS_COLORS[task.status] || STATUS_COLORS.backlog;
                        const href = task.source === 'scheduled'
                          ? '/scheduled'
                          : `/projects/${task.projectId}?task=${task.taskId}`;
                        return (
                          <Link
                            key={task.taskId}
                            href={href}
                            onClick={(e) => e.stopPropagation()}
                            className="block px-3 py-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 transition-colors border border-transparent hover:border-[var(--border-default)]"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', colors.dot)} />
                              <span className={cn('text-[10px] uppercase tracking-wider', colors.text)}>
                                {task.source === 'scheduled' ? 'scheduled' : task.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-primary)] truncate mt-0.5">
                              {task.taskTitle}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)] truncate">
                              {task.projectName}
                            </p>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-default)]">
                    <span className="text-xs text-[var(--text-muted)]">
                      {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); openModal(member); }}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(member.id); }}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Member Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingMember ? editingMember.name : 'Add Member'}
        size="lg"
      >
        {/* Tabs — only when editing an existing member */}
        {editingMember && (
          <div className="flex items-center gap-1 mb-5 -mt-1">
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                activeTab === 'settings'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              <Settings size={12} />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('soul')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                activeTab === 'soul'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              <FileText size={12} />
              SOUL.md
            </button>
            <button
              onClick={() => setActiveTab('memory')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                activeTab === 'memory'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              <FileText size={12} />
              MEMORY.md
            </button>
          </div>
        )}

        {/* Settings tab (edit form) */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              placeholder="Enter name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Role"
              placeholder="Developer, Designer, PM..."
              value={formData.role || ''}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />
            <Textarea
              label="Description"
              placeholder="Frontend, backend, iOS, devops..."
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Input
              label="LLM Model"
              placeholder="Claude Opus 4.5, GPT-4o..."
              value={formData.llmModel || ''}
              onChange={(e) => setFormData({ ...formData, llmModel: e.target.value })}
            />
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">
                Avatar Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {MEMBER_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={cn(
                      'w-8 h-8 rounded-full transition-transform',
                      formData.color === color && 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-secondary)] scale-110'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              {editingMember && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => handleDelete(editingMember.id)}
                  className="mr-auto"
                >
                  <Trash2 size={14} />
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                {editingMember ? 'Save Changes' : 'Add Member'}
              </Button>
            </div>
          </form>
        )}

        {/* SOUL.md tab */}
        {activeTab === 'soul' && editingMember && (
          <div className="rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto p-5">
              {editingMember.soulMd ? (
                <div className="prose-crew text-sm font-mono leading-relaxed text-[var(--text-secondary)]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {editingMember.soulMd}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText size={28} className="mx-auto text-[var(--text-muted)] mb-3" />
                  <p className="text-sm text-[var(--text-muted)]">
                    No SOUL.md content yet.
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    This file is managed by the bot.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MEMORY.md tab */}
        {activeTab === 'memory' && editingMember && (
          <div className="rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto p-5">
              {editingMember.memoryMd ? (
                <div className="prose-crew text-sm font-mono leading-relaxed text-[var(--text-secondary)]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {editingMember.memoryMd}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText size={28} className="mx-auto text-[var(--text-muted)] mb-3" />
                  <p className="text-sm text-[var(--text-muted)]">
                    No MEMORY.md content yet.
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    This file is managed by the bot.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
