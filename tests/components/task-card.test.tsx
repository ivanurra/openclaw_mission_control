import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from '../../components/projects/task-card';
import type { Task } from '../../types';

const baseTask: Task = {
  id: 'task-1',
  projectId: 'project-1',
  title: 'Plan roadmap',
  description: 'Draft the Q1 roadmap.',
  status: 'todo',
  recurring: false,
  priority: 'medium',
  assignedDeveloperId: undefined,
  linkedDocumentIds: [],
  attachments: [],
  comments: [],
  order: 0,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

function renderWithDnd(ui: React.ReactElement) {
  return render(
    <DndContext>
      <SortableContext items={[baseTask.id]} strategy={verticalListSortingStrategy}>
        {ui}
      </SortableContext>
    </DndContext>
  );
}

describe('TaskCard', () => {
  it('opens edit when clicking on the card', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();

    renderWithDnd(<TaskCard task={baseTask} onEdit={onEdit} />);

    await user.click(screen.getByText('Plan roadmap'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('opens menu actions without triggering edit', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();

    renderWithDnd(<TaskCard task={baseTask} onEdit={onEdit} onDelete={onDelete} />);

    await user.click(screen.getByLabelText('Task actions'));
    await user.click(screen.getByText('Delete'));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
  });
});
