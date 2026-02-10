import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PeoplePage from '../../app/(dashboard)/people/page';
import { mockFetchSequence } from '../helpers/fetch-helpers';

const replace = vi.fn();
const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => searchParams,
}));

describe('PeoplePage', () => {
  it('renders members from API', async () => {
    mockFetchSequence([
      [
        {
          id: 'd1',
          name: 'Frank Worsley',
          description: 'Backend',
          role: 'Navigator',
          color: '#123456',
          projectIds: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
      [], // activity for d1
    ]);

    render(<PeoplePage />);

    expect(await screen.findByText('Frank Worsley')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
  });

  it('opens add member modal', async () => {
    mockFetchSequence([[]]);

    render(<PeoplePage />);

    expect(await screen.findByText('Crew')).toBeInTheDocument();
    const user = userEvent.setup();
    const buttons = screen.getAllByRole('button', { name: /add member/i });
    await user.click(buttons[0]);
    expect(await screen.findByRole('heading', { name: 'Add Member' })).toBeInTheDocument();
  });
});
