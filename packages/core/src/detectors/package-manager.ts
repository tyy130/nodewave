// =============================================================================
//  NODEWAVE — @nodewave/core — Package Manager Detector
// =============================================================================

import { fsx as fs } from '../fsx.js';
import path from 'node:path';

export type PackageManager = 'pnpm' | 'yarn' | 'bun' | 'npm';

export async function detectPackageManager(cwd: string): Promise<PackageManager> {
  if (await fs.pathExists(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await fs.pathExists(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (await fs.pathExists(path.join(cwd, 'bun.lockb'))) return 'bun';
  return 'npm';
}

export function installCommand(pm: PackageManager): string {
  const cmds: Record<PackageManager, string> = {
    pnpm: 'pnpm install',
    yarn: 'yarn',
    bun: 'bun install',
    npm: 'npm install',
  };
  return cmds[pm];
}

export function addCommand(pm: PackageManager, pkg: string, dev = false): string {
  const flag = dev ? ' -D' : '';
  const cmds: Record<PackageManager, string> = {
    pnpm: `pnpm add${flag} ${pkg}`,
    yarn: `yarn add${dev ? ' --dev' : ''} ${pkg}`,
    bun: `bun add${flag} ${pkg}`,
    npm: `npm install${flag} ${pkg}`,
  };
  return cmds[pm];
}
