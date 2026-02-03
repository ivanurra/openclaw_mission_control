import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import DocsPage from '../../app/(dashboard)/docs/page';
import { mockFetchSequence } from '../helpers/fetch-helpers';

describe('DocsPage', () => {
  it('renders documents and folders from API', async () => {
    mockFetchSequence([
      [
        {
          id: 'd1',
          slug: 'ice-log',
          title: 'Ice Log',
          content: 'Log content',
          folderId: 'f1',
          linkedTaskIds: [],
          linkedProjectIds: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      [
        {
          id: 'f1',
          slug: 'logs',
          name: 'Logs',
          parentId: null,
          order: 0,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
    ]);

    render(<DocsPage />);

    const user = userEvent.setup();
    const folder = await screen.findByText('Logs');
    expect(folder).toBeInTheDocument();
    await user.click(folder);
    expect(await screen.findByText('Ice Log')).toBeInTheDocument();
  });

  it('opens create folder modal', async () => {
    mockFetchSequence([[], []]);

    render(<DocsPage />);

    expect(await screen.findByText('Documents')).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /new folder/i }));
    expect(await screen.findByText('Create Folder')).toBeInTheDocument();
  });
});
