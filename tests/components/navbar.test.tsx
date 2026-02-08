import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from '../../components/layout/navbar';

let pathname = '/projects';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe('Navbar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-07T10:15:30.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('places Scheduled immediately after Projects', () => {
    pathname = '/projects';
    render(<Navbar />);

    const nav = screen.getByRole('navigation');
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent?.replace(/\s+/g, ' ').trim() ?? '');

    const projectsIndex = labels.indexOf('Projects');
    const scheduledIndex = labels.indexOf('Scheduled');

    expect(projectsIndex).toBeGreaterThanOrEqual(0);
    expect(scheduledIndex).toBe(projectsIndex + 1);
  });

  it('shows mocked AI model and gateway online status in top bar', () => {
    pathname = '/projects';
    render(<Navbar />);

    expect(screen.getByText('Opus 4.6')).toBeInTheDocument();
    expect(screen.getByText('ONLINE')).toBeInTheDocument();
    expect(screen.queryByText('DISCONNECTED')).not.toBeInTheDocument();
  });

  it('orders model, Madrid clock, status, and search in the header', () => {
    pathname = '/projects';
    render(<Navbar />);

    const model = screen.getByText('Opus 4.6');
    const date = screen.getByTestId('madrid-clock-date');
    const time = screen.getByTestId('madrid-clock-time');
    const status = screen.getByText('ONLINE');
    const searchButton = screen.getByRole('button', { name: 'Open search' });

    expect(time.textContent).toBe('11:15');

    expect(model.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(date.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(status.compareDocumentPosition(searchButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
