// =============================================================================
//  NODEWAVE — CLI — add command
// =============================================================================

import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';
import { detectPackageManager, addCommand as buildAddCmd } from '@nodewave/core';

interface AddOptions { cwd: string; dev?: boolean }

// Known packages with post-install configuration hints
const POST_INSTALL_HINTS: Record<string, string> = {
  tailwindcss: 'npx tailwindcss init -p',
  prisma: 'npx prisma init',
  eslint: 'npx eslint --init',
  jest: 'npx jest --init',
};

export async function addCommand(pkg: string, opts: AddOptions) {
  const cwd = opts.cwd ?? process.cwd();
  const pm = await detectPackageManager(cwd);
  const cmd = buildAddCmd(pm, pkg, opts.dev ?? false);

  console.log(chalk.cyan(`\n🌊 nodewave add ${pkg}\n`));
  console.log(chalk.dim(`Running: ${cmd}\n`));

  const spinner = ora(`Installing ${chalk.cyan(pkg)}...`).start();

  try {
    const [bin, ...args] = cmd.split(' ');
    await execa(bin, args, { cwd, stdio: 'inherit' });
    spinner.succeed(chalk.green(`${pkg} installed`));
  } catch {
    spinner.fail(chalk.red(`Failed to install ${pkg}`));
    process.exit(1);
  }

  // Post-install hint
  const hint = POST_INSTALL_HINTS[pkg];
  if (hint) {
    console.log(chalk.dim(`\nInitialize ${pkg}: ${chalk.cyan(hint)}`));
  }
}
