'use client';

import { useState, useEffect } from 'react';
import { Plus, FolderKanban } from 'lucide-react';
import { Button, Modal, Input, Textarea, EmptyState } from '@/components/ui';
import type { Project, CreateProjectInput, Developer } from '@/types';
import { cn } from '@/lib/utils/cn';
import { PROJECT_COLORS } from '@/lib/constants/kanban';
import Link from 'next/link';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: '',
    description: '',
    color: PROJECT_COLORS[0],
  });

  useEffect(() => {
    fetchProjects();
    fetchDevelopers();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchDevelopers() {
    try {
      const res = await fetch('/api/developers');
      const data = await res.json();
      setDevelopers(data);
    } catch (error) {
      console.error('Failed to fetch developers:', error);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const newProject = await res.json();
      setProjects([newProject, ...projects]);
      setIsModalOpen(false);
      setFormData({ name: '', description: '', color: PROJECT_COLORS[0] });
    } catch (error) {
      console.error('Failed to create project:', error);
    }
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Projects</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          New Project
        </Button>
      </div>

      {/* Projects grid */}
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start managing tasks"
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={18} />
              Create Project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.slug}`}
              className="group block p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: project.color + '20' }}
                >
                  <FolderKanban
                    size={20}
                    style={{ color: project.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {project.developerIds.length} member{project.developerIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {project.description && (
                <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                  {project.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Project"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <Input
            label="Project Name"
            placeholder="Enter project name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            placeholder="Optional project description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={cn(
                    'w-8 h-8 rounded-lg transition-transform',
                    formData.color === color && 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-secondary)] scale-110'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
