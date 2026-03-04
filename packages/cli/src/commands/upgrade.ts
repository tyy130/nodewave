// =============================================================================
//  NODEWAVE — CLI — upgrade command
// =============================================================================

import chalk from 'chalk';
import { select, confirm } from '@inquirer/prompts';
import ora from 'ora';
import { detectProjectType, pagesToAppRouter, cjsToEsm, bumpNextVersion } from '@nodewave/core';

interface UpgradeOptions { cwd: string }

export async function upgradeCommand(opts: UpgradeOptions) {
  const cwd = opts.cwd ?? process.cwd();
  console.log(chalk.cyan('\n🌊 nodewave upgrade\n'));

  const typeResult = await detectProjectType(cwd);
  console.log(chalk.dim(`Detected: ${typeResult.framework} ${typeResult.version ?? ''} (${typeResult.type})\n`));

  const action = await select({
    message: 'What would you like to upgrade?',
    choices: [
      { name: 'Pages Router → App Router (Next.js)', value: 'pages-to-app', disabled: typeResult.type !== 'nextjs-pages' ? '(already App Router or not Next.js)' : false },
      { name: 'CommonJS → ES Modules', value: 'cjs-to-esm' },
      { name: 'Bump Next.js to latest', value: 'next-version', disabled: !typeResult.framework.includes('next') ? '(not a Next.js project)' : false },
    ],
  });

  const ok = await confirm({ message: `Apply upgrade: ${chalk.cyan(action)}?`, default: true });
  if (!ok) {
    console.log(chalk.dim('Upgrade cancelled'));
    return;
  }

  const spinner = ora('Applying upgrade...').start();

  if (action === 'pages-to-app') {
    const result = await pagesToAppRouter(cwd);
    spinner.succeed('Pages → App Router upgrade applied');
    result.filesChanged.forEach(f => console.log(chalk.green(`  ${f}`)));
    result.warnings.forEach(w => console.log(chalk.yellow(`  ⚠ ${w}`)));
  } else if (action === 'cjs-to-esm') {
    const result = await cjsToEsm(cwd);
    spinner.succeed('CJS → ESM upgrade applied');
    result.filesChanged.forEach(f => console.log(chalk.green(`  ✓ ${f}`)));
    result.warnings.forEach(w => console.log(chalk.yellow(`  ⚠ ${w}`)));
  } else if (action === 'next-version') {
    const result = await bumpNextVersion(cwd);
    spinner.succeed(`Next.js bumped: ${chalk.dim(result.from ?? '?')} → ${chalk.cyan(result.to)}`);
    console.log(chalk.dim('\nRun your package manager install to apply the update.'));
  }

  console.log('');
}
