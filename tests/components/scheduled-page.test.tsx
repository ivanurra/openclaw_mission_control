import { render, screen } from '@testing-library/react';
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
});
