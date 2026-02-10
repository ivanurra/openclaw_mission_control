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

  it('shows gateway online status in top bar', () => {
    pathname = '/projects';
    render(<Navbar />);

    expect(screen.getByText('ONLINE')).toBeInTheDocument();
    expect(screen.queryByText('DISCONNECTED')).not.toBeInTheDocument();
  });

  it('uses Crew label in navigation instead of People', () => {
    pathname = '/projects';
    render(<Navbar />);

    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('link', { name: /crew/i })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: /people/i })).not.toBeInTheDocument();
  });

  it('orders Madrid clock, status, and search in the header', () => {
    pathname = '/projects';
    render(<Navbar />);

    const date = screen.getByTestId('madrid-clock-date');
    const time = screen.getByTestId('madrid-clock-time');
    const status = screen.getByText('ONLINE');
    const searchButton = screen.getByRole('button', { name: 'Open search' });

    expect(time.textContent).toBe('11:15');

    expect(date.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(status.compareDocumentPosition(searchButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
