import { vi } from 'vitest';

export function mockFetchSequence(responses: unknown[]) {
  const fetchMock = vi.fn();
  responses.forEach((data) => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => data,
    } as Response);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
