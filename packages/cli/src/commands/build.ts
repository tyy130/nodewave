// =============================================================================
//  NODEWAVE — CLI — build command
// =============================================================================

import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';
import { loadConfig, detectProjectType } from '@nodewave/core';

interface BuildOptions { cwd: string }

export async function buildCommand(opts: BuildOptions) {
  const cwd = opts.cwd ?? process.cwd();
  console.log(chalk.cyan('\n🌊 nodewave build\n'));

  const config = await loadConfig(cwd);
  const typeResult = await detectProjectType(cwd);

  const buildCmd = config?.build.command ?? getBuildCommand(typeResult.type);
  const [bin, ...args] = buildCmd.split(' ');

  const spinner = ora(`Building (${chalk.dim(buildCmd)})...`).start();

  try {
    await execa(bin, args, { cwd, stdio: 'pipe' });
    spinner.succeed(chalk.green('Build complete'));
  } catch (err: unknown) {
    spinner.fail(chalk.red('Build failed'));
    if (err && typeof err === 'object' && 'stderr' in err) {
      console.error((err as { stderr: string }).stderr);
    }
    process.exit(1);
  }
}

function getBuildCommand(type: string): string {
  const map: Record<string, string> = {
    'nextjs-app': 'next build',
    'nextjs-pages': 'next build',
    'express': 'tsc',
    'fastify': 'tsc',
  };
  return map[type] ?? 'npm run build';
}
