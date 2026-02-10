import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProjectsPage from '../../app/(dashboard)/projects/page';
import { mockFetchSequence } from '../helpers/fetch-helpers';

describe('ProjectsPage', () => {
  it('renders empty state and opens create modal', async () => {
    mockFetchSequence([[], []]);

    render(<ProjectsPage />);

    expect(await screen.findByText('No projects yet')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /new project/i }));
    expect(await screen.findByRole('heading', { name: 'Create Project' })).toBeInTheDocument();
  });

  it('renders project cards from API', async () => {
    mockFetchSequence([
      [
        {
          id: 'p1',
          slug: 'endurance',
          name: 'Endurance',
          description: 'Expedition',
          color: '#123456',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          memberIds: [],
        },
      ],
      [],
    ]);

    render(<ProjectsPage />);

    expect(await screen.findByText('Endurance')).toBeInTheDocument();
    expect(screen.getByText('Expedition')).toBeInTheDocument();
  });
});
