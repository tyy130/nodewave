// =============================================================================
//  NODEWAVE — @nodewave/core — Native fs helpers (replaces fs-extra)
//  Uses only node:fs/promises — no CJS dependencies
// =============================================================================

import { access, constants, readFile, writeFile, mkdir, readdir, cp, rename, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const fsx = {
  async pathExists(p: string): Promise<boolean> {
    return access(p, constants.F_OK).then(() => true, () => false);
  },

  async readJson(p: string): Promise<unknown> {
    const content = await readFile(p, 'utf8');
    return JSON.parse(content);
  },

  async writeJson(p: string, data: unknown, opts?: { spaces?: number }): Promise<void> {
    const content = JSON.stringify(data, null, opts?.spaces ?? 2);
    await writeFile(p, content, 'utf8');
  },

  async ensureDir(p: string): Promise<void> {
    await mkdir(p, { recursive: true });
  },

  async readFile(p: string, encoding: 'utf8'): Promise<string> {
    return readFile(p, encoding);
  },

  async writeFile(p: string, content: string, encoding: 'utf8' = 'utf8'): Promise<void> {
    return writeFile(p, content, encoding);
  },

  async readdir(p: string, opts?: { withFileTypes: true }): Promise<import('node:fs').Dirent[]> {
    return readdir(p, { withFileTypes: true });
  },

  async copy(src: string, dest: string): Promise<void> {
    await mkdir(path.dirname(dest), { recursive: true });
    await cp(src, dest, { recursive: true });
  },

  async move(src: string, dest: string, opts?: { overwrite?: boolean }): Promise<void> {
    await mkdir(path.dirname(dest), { recursive: true });
    await rename(src, dest).catch(async () => {
      // cross-device rename fallback
      await cp(src, dest, { recursive: true, force: opts?.overwrite });
    });
  },
};
