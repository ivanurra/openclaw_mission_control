import { render, screen, within, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSidebar } from '../../components/layout/app-sidebar';
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

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

function renderWithProvider() {
  return render(
    <SidebarProvider>
      <Navbar />
      <AppSidebar />
    </SidebarProvider>
  );
}

describe('AppSidebar', () => {
  beforeEach(() => {
    localStorageMock.clear();
    pathname = '/projects';
  });

  it('renders all navigation items', () => {
    renderWithProvider();

    const nav = screen.getByRole('navigation');
    const links = within(nav).getAllByRole('link');
    const labels = links.map((l) => l.textContent?.trim());

    expect(labels).toEqual(['Projects', 'Scheduled', 'Docs', 'Crew', 'Memory']);
  });

  it('places Scheduled immediately after Projects', () => {
    renderWithProvider();

    const nav = screen.getByRole('navigation');
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent?.trim() ?? '');

    const projectsIndex = labels.indexOf('Projects');
    const scheduledIndex = labels.indexOf('Scheduled');

    expect(projectsIndex).toBeGreaterThanOrEqual(0);
    expect(scheduledIndex).toBe(projectsIndex + 1);
  });

  it('uses Crew label instead of People', () => {
    renderWithProvider();

    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('link', { name: /crew/i })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: /people/i })).not.toBeInTheDocument();
  });

  it('toggles sidebar via navbar button and persists state', () => {
    renderWithProvider();

    const sidebar = screen.getByTestId('app-sidebar');
    expect(sidebar.className).toContain('w-52');

    const closeBtn = screen.getByLabelText('Close sidebar');
    fireEvent.click(closeBtn);

    expect(sidebar.className).toContain('w-0');
    expect(localStorageMock.getItem('sidebar-open')).toBe('false');

    // Button is still accessible in navbar to reopen
    const openBtn = screen.getByLabelText('Open sidebar');
    fireEvent.click(openBtn);

    expect(sidebar.className).toContain('w-52');
    expect(localStorageMock.getItem('sidebar-open')).toBe('true');
  });

  it('defaults to open when no localStorage value', () => {
    renderWithProvider();

    const sidebar = screen.getByTestId('app-sidebar');
    expect(sidebar.className).toContain('w-52');
  });

  it('restores closed state from localStorage', () => {
    localStorageMock.setItem('sidebar-open', 'false');
    renderWithProvider();

    const sidebar = screen.getByTestId('app-sidebar');
    expect(sidebar.className).toContain('w-0');
  });

  it('highlights the active nav item based on pathname', () => {
    pathname = '/docs';
    renderWithProvider();

    const nav = screen.getByRole('navigation');
    const docsLink = within(nav).getByRole('link', { name: /docs/i });
    const projectsLink = within(nav).getByRole('link', { name: /projects/i });

    expect(docsLink.className).toContain('bg-[var(--bg-elevated)]');
    expect(projectsLink.className).not.toContain('bg-[var(--bg-elevated)]');
  });

  it('nav links point to the correct hrefs', () => {
    renderWithProvider();

    const nav = screen.getByRole('navigation');
    const links = within(nav).getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));

    expect(hrefs).toEqual(['/projects', '/scheduled', '/docs', '/people', '/memory']);
  });
});
