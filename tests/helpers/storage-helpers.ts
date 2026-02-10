import path from 'path';
import os from 'os';
import { mkdtemp, rm } from 'fs/promises';
import { vi } from 'vitest';

export async function withStorage<T>(fn: (dataDir: string) => Promise<T>): Promise<T> {
  const original = process.env.MC_DATA_DIR;
  const dir = await mkdtemp(path.join(os.tmpdir(), 'mc-data-'));
  process.env.MC_DATA_DIR = dir;
  vi.resetModules();

  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
    if (original === undefined) {
      delete process.env.MC_DATA_DIR;
    } else {
      process.env.MC_DATA_DIR = original;
    }
    vi.resetModules();
  }
}
