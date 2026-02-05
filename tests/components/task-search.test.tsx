import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { TaskSearch } from '../../components/layout/task-search';

let pathname = '/projects/alpha';
const push = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    push,
    replace: vi.fn(),
  }),
}));

describe('TaskSearch', () => {
  beforeEach(() => {
    push.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not render search when not inside a project', () => {
    pathname = '/projects';
    render(<TaskSearch />);

    expect(screen.queryByLabelText('Search tasks')).not.toBeInTheDocument();
  });

  it('searches tasks and navigates to selected result', async () => {
    pathname = '/projects/alpha';
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 'task-1',
          projectId: 'alpha',
          title: 'Fix onboarding',
          description: 'Improve the first-run experience.',
          status: 'todo',
          recurring: false,
          priority: 'medium',
          assignedDeveloperId: undefined,
          linkedDocumentIds: [],
          order: 0,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ],
    } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<TaskSearch />);

    const input = screen.getByLabelText('Search tasks');
    await user.click(input);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    await user.type(input, 'Fix');
    expect(await screen.findByText('Fix onboarding')).toBeInTheDocument();

    await user.click(screen.getByText('Fix onboarding'));
    expect(push).toHaveBeenCalledWith('/projects/alpha?task=task-1');
  });
});
