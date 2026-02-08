import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MemoryPage from '../../app/(dashboard)/memory/page';
import { mockFetchSequence } from '../helpers/fetch-helpers';

let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}));

function mockResponse(data: unknown, ok = true): Response {
  return {
    ok,
    json: async () => data,
  } as Response;
}

describe('MemoryPage', () => {
  afterEach(() => {
    searchParams = new URLSearchParams();
    vi.unstubAllGlobals();
  });

  it('shows OpenClaw subtitle and labels assistant messages as Bot', async () => {
    mockFetchSequence([
      { dates: ['2026-02-07'] },
      { favorites: [] },
      {
        date: '2026-02-07',
        messages: [
          { role: 'assistant', content: 'Status is green.', timestamp: '09:00' },
        ],
      },
    ]);

    render(<MemoryPage />);

    expect(await screen.findByText('OpenClaw conversations')).toBeInTheDocument();
    expect(await screen.findByText('Bot')).toBeInTheDocument();
  });

  it('loads the latest day with conversation by default, including after remount', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/memory') return mockResponse({ dates: ['2026-02-07', '2026-02-01'] });
      if (url === '/api/memory/favorites') return mockResponse({ favorites: [] });
      if (url === '/api/memory?date=2026-02-07') return mockResponse({ date: '2026-02-07', messages: [] });
      return mockResponse({});
    });
    vi.stubGlobal('fetch', fetchMock);

    const { unmount } = render(<MemoryPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/memory?date=2026-02-07');
    });

    unmount();
    render(<MemoryPage />);

    await waitFor(() => {
      const callsToLatest = fetchMock.mock.calls.filter(
        ([input]) => String(input) === '/api/memory?date=2026-02-07'
      );
      expect(callsToLatest.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('allows selecting a day without conversation and shows an empty-chat message', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/memory') return mockResponse({ dates: ['2026-02-07'] });
      if (url === '/api/memory/favorites') return mockResponse({ favorites: [] });
      if (url === '/api/memory?date=2026-02-07') {
        return mockResponse({
          date: '2026-02-07',
          messages: [{ role: 'user', content: 'Hello', timestamp: '09:00' }],
        });
      }
      if (url === '/api/memory?date=2026-02-08') {
        return mockResponse({ error: 'Conversation not found' }, false);
      }
      return mockResponse({});
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryPage />);

    expect(await screen.findByText('Hello')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '8' }));

    expect(await screen.findByText('No messages for this day.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/memory?date=2026-02-08');
  });
});
