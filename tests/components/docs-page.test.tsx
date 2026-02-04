import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import DocsPage from '../../app/(dashboard)/docs/page';
import { mockFetchSequence } from '../helpers/fetch-helpers';

describe('DocsPage', () => {
  it('renders documents and folders from API and opens a document', async () => {
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
    ]);

    render(<DocsPage />);

    const user = userEvent.setup();
    const folder = await screen.findByText('Logs');
    expect(folder).toBeInTheDocument();
    await user.click(folder);
    const docItem = await screen.findByText('Ice Log');
    await user.click(docItem);

    expect(await screen.findByDisplayValue('Ice Log')).toBeInTheDocument();
    const contentMatches = await screen.findAllByText('Log content');
    expect(contentMatches).toHaveLength(1);
  });

  it('opens create folder modal', async () => {
    mockFetchSequence([[], []]);

    render(<DocsPage />);

    expect(await screen.findByText('Documents')).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /new folder/i }));
    expect(await screen.findByText('Create Folder')).toBeInTheDocument();
  });

  it('creates a document inline and opens the editor', async () => {
    const fetchMock = mockFetchSequence([
      [],
      [],
      {
        id: 'd-new',
        slug: 'untitled',
        title: 'Untitled',
        content: '',
        folderId: null,
        linkedTaskIds: [],
        linkedProjectIds: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'd-new',
        slug: 'untitled',
        title: 'Untitled',
        content: '',
        folderId: null,
        linkedTaskIds: [],
        linkedProjectIds: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]);

    render(<DocsPage />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /new doc/i }));

    expect(await screen.findByDisplayValue('Untitled')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/documents',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('shows the app delete modal for documents', async () => {
    const fetchMock = mockFetchSequence([
      [
        {
          id: 'd1',
          slug: 'ice-log',
          title: 'Ice Log',
          content: 'Log content',
          folderId: null,
          linkedTaskIds: [],
          linkedProjectIds: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      [],
      {
        id: 'd1',
        slug: 'ice-log',
        title: 'Ice Log',
        content: 'Log content',
        folderId: null,
        linkedTaskIds: [],
        linkedProjectIds: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      { success: true },
    ]);

    render(<DocsPage />);

    const user = userEvent.setup();
    await user.click(await screen.findByText('Ice Log'));
    const deleteButtons = await screen.findAllByRole('button', { name: /delete document/i });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    expect(await screen.findByRole('heading', { name: /delete document/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/documents/d1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
