import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import DocsPage from '../../app/(dashboard)/docs/page';
import { mockFetchSequence } from '../helpers/fetch-helpers';

let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}));

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
    await user.click(screen.getByRole('button', { name: /create folder/i }));
    expect(await screen.findByRole('heading', { name: 'Create Folder' })).toBeInTheDocument();
  });

  it('renames a folder from the tree', async () => {
    const fetchMock = mockFetchSequence([
      [],
      [
        {
          id: 'f1',
          slug: 'notes',
          name: 'Notes',
          parentId: null,
          order: 0,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
      {
        id: 'f1',
        slug: 'product-notes',
        name: 'Product Notes',
        parentId: null,
        order: 0,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]);

    render(<DocsPage />);

    const user = userEvent.setup();
    await screen.findByText('Notes');
    await user.click(screen.getByRole('button', { name: /rename folder/i }));

    expect(await screen.findByRole('heading', { name: /rename folder/i })).toBeInTheDocument();
    const folderNameInput = screen.getByLabelText('Folder Name');
    await user.clear(folderNameInput);
    await user.type(folderNameInput, 'Product Notes');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/folders/f1',
      expect.objectContaining({ method: 'PUT' })
    );
    expect(await screen.findByText('Product Notes')).toBeInTheDocument();
  });

  it('filters documents with the sidebar search', async () => {
    mockFetchSequence([
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
        {
          id: 'd2',
          slug: 'crew-notes',
          title: 'Crew Notes',
          content: 'Some notes',
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
    ]);

    render(<DocsPage />);

    const user = userEvent.setup();
    const searchInput = await screen.findByLabelText('Search documents');
    await user.type(searchInput, 'Ice');

    const results = await screen.findByTestId('doc-search-results');
    expect(within(results).getByText('Ice Log')).toBeInTheDocument();
    expect(within(results).queryByText('Crew Notes')).not.toBeInTheDocument();

    await user.click(within(results).getByText('Ice Log'));
    expect(await screen.findByDisplayValue('Ice Log')).toBeInTheDocument();
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

  it('imports a markdown file and opens it in the editor', async () => {
    const importedDocument = {
      id: 'd-import',
      slug: 'imported-notes',
      title: 'Imported Notes',
      content: '# Imported Notes\n\nBody',
      folderId: null,
      linkedTaskIds: [],
      linkedProjectIds: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const fetchMock = mockFetchSequence([
      [],
      [],
      importedDocument,
      importedDocument,
    ]);

    render(<DocsPage />);

    const user = userEvent.setup();
    const input = await screen.findByTestId('markdown-import-input');
    const file = new File(['# Imported Notes\n\nBody'], 'imported-notes.md', { type: 'text/markdown' });

    await user.upload(input, file);

    expect(await screen.findByDisplayValue('Imported Notes')).toBeInTheDocument();
    const postCall = fetchMock.mock.calls[2];
    expect(postCall[0]).toBe('/api/documents');
    expect(postCall[1]).toMatchObject({ method: 'POST' });
    expect(String((postCall[1] as { body: string }).body)).toContain('# Imported Notes');
  });

  it('exports the active document to a markdown file', async () => {
    const sourceDocument = {
      id: 'd1',
      slug: 'ice-log',
      title: 'Ice Log',
      content: 'Log content',
      folderId: null,
      linkedTaskIds: [],
      linkedProjectIds: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockFetchSequence([
      [sourceDocument],
      [],
      sourceDocument,
    ]);

    const createObjectURLMock = vi.fn(() => 'blob:export-md');
    const revokeObjectURLMock = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURLMock,
    });

    try {
      render(<DocsPage />);

      const user = userEvent.setup();
      await user.click(await screen.findByText('Ice Log'));
      await user.click(await screen.findByRole('button', { name: /export \.md/i }));

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:export-md');
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(await screen.findByText(/exported as ice-log\.md/i)).toBeInTheDocument();
    } finally {
      clickSpy.mockRestore();
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: originalCreateObjectURL,
      });
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: originalRevokeObjectURL,
      });
    }
  });

  it('supports dragging a document into a folder', async () => {
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

    const docItem = await screen.findByText('Ice Log');
    const folderItem = await screen.findByText('Logs');

    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
    };

    const draggableDoc = docItem.closest('div') as HTMLElement;
    const droppableFolder = folderItem.closest('div') as HTMLElement;

    await act(async () => {
      fireEvent.dragStart(draggableDoc, { dataTransfer });
    });

    await act(async () => {
      fireEvent.dragOver(droppableFolder, { dataTransfer });
      fireEvent.drop(droppableFolder, { dataTransfer });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/documents/d1',
      expect.objectContaining({ method: 'PUT' })
    );
    const lastCall = fetchMock.mock.calls[2];
    expect(String((lastCall[1] as { body: string }).body)).toContain('"folderId":"f1"');
  });

  it('renders root folders alphabetically before root documents', async () => {
    mockFetchSequence([
      [
        {
          id: 'd1',
          slug: 'root-doc',
          title: 'Root Doc',
          content: 'Root content',
          folderId: null,
          linkedTaskIds: [],
          linkedProjectIds: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      [
        {
          id: 'f2',
          slug: 'zeta',
          name: 'zeta',
          parentId: null,
          order: 1,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'f1',
          slug: 'alpha',
          name: 'alpha',
          parentId: null,
          order: 0,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
    ]);

    render(<DocsPage />);

    const alphaFolder = await screen.findByText('alpha');
    const zetaFolder = await screen.findByText('zeta');
    const rootDoc = await screen.findByText('Root Doc');

    expect(Boolean(alphaFolder.compareDocumentPosition(zetaFolder) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(zetaFolder.compareDocumentPosition(rootDoc) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('supports dragging a folder into another folder', async () => {
    const fetchMock = mockFetchSequence([
      [],
      [
        {
          id: 'f1',
          slug: 'parent',
          name: 'Parent',
          parentId: null,
          order: 0,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'f2',
          slug: 'child-candidate',
          name: 'Child Candidate',
          parentId: null,
          order: 1,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
      {
        id: 'f2',
        slug: 'child-candidate',
        name: 'Child Candidate',
        parentId: 'f1',
        order: 0,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]);

    render(<DocsPage />);

    const draggableFolderLabel = await screen.findByText('Child Candidate');
    const targetFolderLabel = await screen.findByText('Parent');

    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
    };

    const draggableFolder = draggableFolderLabel.closest('div') as HTMLElement;
    const targetFolder = targetFolderLabel.closest('div') as HTMLElement;

    await act(async () => {
      fireEvent.dragStart(draggableFolder, { dataTransfer });
    });

    await act(async () => {
      fireEvent.dragOver(targetFolder, { dataTransfer });
      fireEvent.drop(targetFolder, { dataTransfer });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/folders/f2',
      expect.objectContaining({ method: 'PUT' })
    );
    const lastCall = fetchMock.mock.calls[2];
    expect(String((lastCall[1] as { body: string }).body)).toContain('"parentId":"f1"');
  });
});
