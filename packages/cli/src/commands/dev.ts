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

  console.log(chalk.dim(`Starting dev server (${devCmd})...`));

  const separator = chalk.dim('─'.repeat(50));
  const handoff = (label: string) => {
    console.log(`\n${separator}`);
    console.log(chalk.dim(`  from ${label}:`));
    console.log(`${separator}\n`);
  };

  try {
    handoff(bin);
    await execa(bin, args, { cwd, stdio: 'inherit' });
  } catch (err: any) {
    if (err.code === 'ENOENT' || err.exitCode === 127) {
      console.log(chalk.yellow(`  ⚠ '${bin}' not found in PATH — falling back to npm run dev`));
      handoff('npm run dev');
      await execa('npm', ['run', 'dev'], { cwd, stdio: 'inherit' });
    } else if (err.exitCode !== undefined && err.exitCode !== 0) {
      console.error(chalk.red(`\n  ✗ Dev server exited with code ${err.exitCode}`));
      process.exit(err.exitCode);
    }
  }
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
