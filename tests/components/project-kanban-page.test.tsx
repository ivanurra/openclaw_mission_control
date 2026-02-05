import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectKanbanPage from '../../app/(dashboard)/projects/[projectId]/page';
import { mockFetchSequence } from '../helpers/fetch-helpers';

const push = vi.fn();
const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    replace,
  }),
  useSearchParams: () => searchParams,
}));

const project = {
  id: 'project-1',
  slug: 'alpha',
  name: 'Alpha',
  description: 'Project Alpha',
  color: '#22c55e',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  developerIds: [],
};

const tasks = [
  {
    id: 'task-recurring',
    projectId: 'project-1',
    title: 'Weekly sync',
    description: '',
    status: 'recurring',
    recurring: true,
    priority: 'low',
    assignedDeveloperId: undefined,
    linkedDocumentIds: [],
    order: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'task-todo',
    projectId: 'project-1',
    title: 'Draft brief',
    description: '',
    status: 'todo',
    recurring: false,
    priority: 'medium',
    assignedDeveloperId: undefined,
    linkedDocumentIds: [],
    order: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'task-progress',
    projectId: 'project-1',
    title: 'Build UI',
    description: '',
    status: 'in_progress',
    recurring: false,
    priority: 'high',
    assignedDeveloperId: undefined,
    linkedDocumentIds: [],
    order: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'task-done',
    projectId: 'project-1',
    title: 'Finalize scope',
    description: '',
    status: 'done',
    recurring: false,
    priority: 'medium',
    assignedDeveloperId: undefined,
    linkedDocumentIds: [],
    order: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

const developers: unknown[] = [];

async function renderPage(fetchMock = mockFetchSequence([project, tasks, developers])) {
  let renderResult: ReturnType<typeof render>;
  await act(async () => {
    renderResult = render(<ProjectKanbanPage params={Promise.resolve({ projectId: 'alpha' })} />);
  });

  return {
    fetchMock,
    ...(renderResult as ReturnType<typeof render>),
  };
}

describe('ProjectKanbanPage', () => {
  beforeEach(() => {
    push.mockClear();
    replace.mockClear();
    searchParams = new URLSearchParams();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders metrics in order and shows recurring column', async () => {
    await renderPage();

    const metrics = await screen.findByTestId('project-metrics');
    const groups = Array.from(metrics.children);

    expect(groups).toHaveLength(4);
    expect(groups[0]).toHaveTextContent('Total Tasks');
    expect(groups[0]).toHaveTextContent('3');
    expect(groups[1]).toHaveTextContent('In Progress');
    expect(groups[1]).toHaveTextContent('1');
    expect(groups[2]).toHaveTextContent('Completed');
    expect(groups[2]).toHaveTextContent('1');
    expect(groups[3]).toHaveTextContent('Completion');
    expect(groups[3]).toHaveTextContent('33%');

    expect(await screen.findByText('Recurring')).toBeInTheDocument();
  });

  it('opens edit modal when clicking a task card', async () => {
    await renderPage();

    const taskTitle = await screen.findByText('Draft brief');
    const user = userEvent.setup();
    await user.click(taskTitle);

    expect(await screen.findByRole('heading', { name: /edit task/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Draft brief')).toBeInTheDocument();
  });

  it('shows delete task modal from the task menu', async () => {
    await renderPage();

    const user = userEvent.setup();
    await screen.findByText('Draft brief');

    await user.click(screen.getAllByLabelText('Task actions')[0]);
    await user.click(screen.getByText('Delete'));

    expect(await screen.findByRole('heading', { name: /delete task/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /edit task/i })).not.toBeInTheDocument();
  });

  it('allows updating the project name in settings', async () => {
    const fetchMock = mockFetchSequence([project, tasks, developers]);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...project, name: 'Alpha Updated' }),
    } as Response);

    await renderPage(fetchMock);

    const user = userEvent.setup();
    await user.click(await screen.findByLabelText('Project settings'));

    const nameInput = await screen.findByLabelText('Project Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Alpha Updated');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    const updateCall = fetchMock.mock.calls.find((call) => {
      const init = call[1] as RequestInit | undefined;
      return init?.method === 'PUT';
    });

    expect(updateCall).toBeTruthy();
    const body = updateCall?.[1]?.body as string;
    expect(body).toContain('Alpha Updated');
  });

  it('shows delete project modal from settings', async () => {
    await renderPage();

    const user = userEvent.setup();
    await user.click(await screen.findByLabelText('Project settings'));
    await user.click(screen.getByRole('button', { name: /delete project/i }));

    expect(await screen.findByRole('heading', { name: /delete project/i })).toBeInTheDocument();
  });
});
