'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Trash2, Pencil } from 'lucide-react';
import { Button, Modal, Input, Textarea, EmptyState, Avatar } from '@/components/ui';
import type { Developer, CreateDeveloperInput } from '@/types';
import { cn } from '@/lib/utils/cn';
import { DEVELOPER_COLORS } from '@/lib/constants/kanban';

export default function PeoplePage() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeveloper, setEditingDeveloper] = useState<Developer | null>(null);
  const [formData, setFormData] = useState<CreateDeveloperInput>({
    name: '',
    role: '',
    description: '',
    color: DEVELOPER_COLORS[0],
  });

  useEffect(() => {
    fetchDevelopers();
  }, []);

  async function fetchDevelopers() {
    try {
      const res = await fetch('/api/developers');
      const data = await res.json();
      setDevelopers(data);
    } catch (error) {
      console.error('Failed to fetch developers:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingDeveloper) {
        const res = await fetch(`/api/developers/${editingDeveloper.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const updated = await res.json();
        setDevelopers(developers.map(d => d.id === updated.id ? updated : d));
      } else {
        const res = await fetch('/api/developers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const newDeveloper = await res.json();
        setDevelopers([...developers, newDeveloper]);
      }
      closeModal();
    } catch (error) {
      console.error('Failed to save developer:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this developer?')) return;

    try {
      await fetch(`/api/developers/${id}`, { method: 'DELETE' });
      setDevelopers(developers.filter(d => d.id !== id));
    } catch (error) {
      console.error('Failed to delete developer:', error);
    }
  }

  function openEditModal(developer: Developer) {
    setEditingDeveloper(developer);
    setFormData({
      name: developer.name,
      role: developer.role || '',
      description: developer.description || '',
      color: developer.color,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingDeveloper(null);
    setFormData({
      name: '',
      role: '',
      description: '',
      color: DEVELOPER_COLORS[developers.length % DEVELOPER_COLORS.length],
    });
  }

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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">People</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {developers.length} team member{developers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Add Developer
        </Button>
      </div>

      {/* Developers grid */}
      {developers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Add developers to assign them to projects and tasks"
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={18} />
              Add Developer
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {developers.map((developer) => (
            <div
              key={developer.id}
              className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] group"
            >
              <div className="flex items-start gap-3">
                <Avatar name={developer.name} color={developer.color} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">
                    {developer.name}
                  </h3>
                  {developer.role && (
                    <p className="text-sm text-[var(--text-secondary)] truncate">
                      {developer.role}
                    </p>
                  )}
                  {developer.description && (
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1">
                      {developer.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-default)]">
                <span className="text-xs text-[var(--text-muted)]">
                  {developer.projectIds.length} project{developer.projectIds.length !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(developer)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(developer.id)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Developer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDeveloper ? 'Edit Developer' : 'Add Developer'}
      >
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
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">
              Avatar Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {DEVELOPER_COLORS.map((color) => (
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
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingDeveloper ? 'Save Changes' : 'Add Developer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
