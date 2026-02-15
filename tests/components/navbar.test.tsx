import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from '../../components/layout/navbar';
import { SidebarProvider } from '../../components/layout/sidebar-context';

let pathname = '/projects';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

function renderNavbar() {
  return render(
    <SidebarProvider>
      <Navbar />
    </SidebarProvider>
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-07T10:15:30.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows gateway online status in top bar', () => {
    pathname = '/projects';
    renderNavbar();

    expect(screen.getByText('ONLINE')).toBeInTheDocument();
    expect(screen.queryByText('DISCONNECTED')).not.toBeInTheDocument();
  });

  it('orders Madrid clock, status, and search in the header', () => {
    pathname = '/projects';
    renderNavbar();

    const date = screen.getByTestId('madrid-clock-date');
    const time = screen.getByTestId('madrid-clock-time');
    const status = screen.getByText('ONLINE');
    const searchButton = screen.getByRole('button', { name: 'Open search' });

    expect(time.textContent).toBe('11:15');

    expect(date.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(status.compareDocumentPosition(searchButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders sidebar toggle button', () => {
    pathname = '/projects';
    renderNavbar();

    expect(screen.getByLabelText('Close sidebar')).toBeInTheDocument();
  });
});
