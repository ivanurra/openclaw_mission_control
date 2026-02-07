import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ScheduledPage from '../../app/(dashboard)/scheduled/page';
import { mockFetchSequence } from '../helpers/fetch-helpers';

describe('ScheduledPage', () => {
  it('renders Monday before Sunday and shows scheduled tasks', async () => {
    mockFetchSequence([
      [
        {
          id: 't1',
          title: 'Morning Brief',
          description: 'Daily notes',
          time: '08:00',
          dayOfWeek: 'monday',
          color: '#f59e0b',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
    ]);

    render(<ScheduledPage />);

    const monday = await screen.findByText('Monday');
    const sunday = screen.getByText('Sunday');
    expect(monday.compareDocumentPosition(sunday) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const matches = await screen.findAllByText('Morning Brief');
    expect(matches.length).toBeGreaterThan(0);
    expect(screen.getByText('Always Running')).toBeInTheDocument();
    expect(screen.getByText('Next Up')).toBeInTheDocument();
    expect(screen.getByText('Automated routines and recurring focus blocks.')).toBeInTheDocument();
    expect(screen.getByText('endur check')).toBeInTheDocument();
  });

  it('opens the add recurring task modal and submits', async () => {
    const fetchMock = mockFetchSequence([
      [],
      {
        id: 't-new',
        title: 'Standup',
        description: 'Team sync',
        time: '10:00',
        dayOfWeek: 'tuesday',
        color: '#22c55e',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]);

    render(<ScheduledPage />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /add task/i }));

    expect(await screen.findByText('Add Recurring Task')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Title'), 'Standup');
    await user.type(screen.getByLabelText('Description'), 'Team sync');
    await user.clear(screen.getByLabelText('Time'));
    await user.type(screen.getByLabelText('Time'), '10:00');
    await user.selectOptions(screen.getByLabelText('Day of the Week'), 'tuesday');
    await user.click(screen.getByLabelText('Select #22c55e'));

    const addButtons = screen.getAllByRole('button', { name: /^add task$/i });
    await user.click(addButtons[addButtons.length - 1]);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/scheduled',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('switches between week and today views', async () => {
    mockFetchSequence([[]]);
    render(<ScheduledPage />);

    expect(await screen.findAllByTestId('scheduled-day-card')).toHaveLength(7);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Today' }));

    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByTestId('scheduled-day-card')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Week' }));
    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByTestId('scheduled-day-card')).toHaveLength(7);
  });

  it('refreshes scheduled data when clicking refresh', async () => {
    const fetchMock = mockFetchSequence([
      [
        {
          id: 't1',
          title: 'Morning Brief',
          description: '',
          time: '08:00',
          dayOfWeek: 'monday',
          color: '#22c55e',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      [
        {
          id: 't2',
          title: 'Evening Wrap',
          description: '',
          time: '18:00',
          dayOfWeek: 'friday',
          color: '#f97316',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
    ]);

    render(<ScheduledPage />);

    expect((await screen.findAllByText('Morning Brief')).length).toBeGreaterThan(0);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /refresh scheduled data/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect((await screen.findAllByText('Evening Wrap')).length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Morning Brief')).toHaveLength(0);
  });

  it('opens a weekly task, edits it, and saves changes', async () => {
    const fetchMock = mockFetchSequence([
      [
        {
          id: 't1',
          title: 'Morning Brief',
          description: 'Daily notes',
          time: '08:00',
          dayOfWeek: 'monday',
          color: '#22c55e',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      {
        id: 't1',
        title: 'Morning Brief Updated',
        description: 'Updated notes',
        time: '11:00',
        dayOfWeek: 'tuesday',
        color: '#06b6d4',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    ]);

    render(<ScheduledPage />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /edit scheduled task morning brief/i }));

    expect(await screen.findByText('Edit Recurring Task')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Morning Brief Updated');
    await user.clear(screen.getByLabelText('Description'));
    await user.type(screen.getByLabelText('Description'), 'Updated notes');
    await user.clear(screen.getByLabelText('Time'));
    await user.type(screen.getByLabelText('Time'), '11:00');
    await user.selectOptions(screen.getByLabelText('Day of the Week'), 'tuesday');
    await user.click(screen.getByLabelText('Select #06b6d4'));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/scheduled/t1',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect((await screen.findAllByText('Morning Brief Updated')).length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Morning Brief')).toHaveLength(0);
  });

  it('deletes a task from the edit modal', async () => {
    const fetchMock = mockFetchSequence([
      [
        {
          id: 't1',
          title: 'Morning Brief',
          description: 'Daily notes',
          time: '08:00',
          dayOfWeek: 'monday',
          color: '#22c55e',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      { success: true },
    ]);

    render(<ScheduledPage />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /edit scheduled task morning brief/i }));
    expect(await screen.findByText('Edit Recurring Task')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /delete task/i }));
    expect(await screen.findByText('Delete Task')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/scheduled/t1',
      expect.objectContaining({
        method: 'DELETE',
      })
    );

    await waitFor(() => {
      expect(screen.queryAllByText('Morning Brief')).toHaveLength(0);
    });
  });
});
