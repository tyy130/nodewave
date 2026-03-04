// =============================================================================
//  NODEWAVE — CLI — dev command
// =============================================================================

import chalk from 'chalk';
import { execa } from 'execa';
import { loadConfig, detectProjectType } from '@nodewave/core';

interface DevOptions { cwd: string }

export async function devCommand(opts: DevOptions) {
  const cwd = opts.cwd ?? process.cwd();
  console.log(chalk.cyan('\n🌊 nodewave dev\n'));

  const config = await loadConfig(cwd);
  const typeResult = await detectProjectType(cwd);

  const devCmd = getDevCommand(typeResult.type);
  const [bin, ...args] = devCmd.split(' ');

  console.log(chalk.dim(`Starting dev server (${devCmd})...\n`));

  // Pass through stdio so the dev server output is visible
  await execa(bin, args, { cwd, stdio: 'inherit' }).catch(() => {});
}

function getDevCommand(type: string): string {
  const map: Record<string, string> = {
    'nextjs-app': 'next dev',
    'nextjs-pages': 'next dev',
    'express': 'tsx watch src/index.ts',
    'fastify': 'tsx watch src/index.ts',
  };
  return map[type] ?? 'npm run dev';
}
