import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
});
