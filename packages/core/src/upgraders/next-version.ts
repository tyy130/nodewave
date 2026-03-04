// =============================================================================
//  NODEWAVE — @nodewave/core — Upgrader: Next.js Version Bumper
// =============================================================================

import { fsx as fs } from '../fsx.js';
import path from 'node:path';
import { execa } from 'execa';

export async function bumpNextVersion(cwd: string, targetVersion = 'latest'): Promise<{ changed: boolean; from: string | null; to: string }> {
  const pkgPath = path.join(cwd, 'package.json');
  if (!await fs.pathExists(pkgPath)) return { changed: false, from: null, to: targetVersion };

  const pkg = await fs.readJson(pkgPath) as Record<string, Record<string, string>>;
  const deps = pkg['dependencies'] ?? {};
  const devDeps = pkg['devDependencies'] ?? {};

  const currentVersion = deps['next'] ?? devDeps['next'] ?? null;

  if (deps['next']) deps['next'] = targetVersion;
  if (devDeps['next']) devDeps['next'] = targetVersion;

  await fs.writeJson(pkgPath, pkg, { spaces: 2 });

  // Also upgrade peer deps that are commonly versioned with Next.js
  for (const dep of ['react', 'react-dom']) {
    if (deps[dep]) deps[dep] = '^18.3.1';
    if (devDeps[dep]) devDeps[dep] = '^18.3.1';
  }
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });

  return { changed: true, from: currentVersion, to: targetVersion };
}
