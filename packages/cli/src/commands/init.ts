// =============================================================================
//  NODEWAVE — CLI — init command
// =============================================================================

import path from 'node:path';
import { access } from 'node:fs/promises';
import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';
import {
  generateDefaultConfig,
  saveConfig,
  detectPackageManager,
  renderTemplate,
} from '@nodewave/core';
import type { ProjectType } from '@nodewave/core';

interface InitOptions {
  type?: string;
  target?: string;
}

export async function initCommand(name: string | undefined, opts: InitOptions) {
  console.log(chalk.cyan('\n🌊 nodewave init\n'));

  const projectName = name ?? await input({
    message: 'Project name:',
    default: 'my-app',
    validate: (v) => /^[a-z0-9-_]+$/.test(v) || 'Use lowercase letters, numbers, hyphens, underscores',
  });

  const type = (opts.type as ProjectType | undefined) ?? await select<ProjectType>({
    message: 'Project type:',
    choices: [
      { name: 'Next.js App Router (full-stack)', value: 'nextjs-app' },
      { name: 'Next.js Pages Router', value: 'nextjs-pages' },
      { name: 'Express API', value: 'express' },
      { name: 'Fastify API', value: 'fastify' },
    ],
  });

  const target = (opts.target as 'vercel' | 'netlify' | 'railway') ?? await select({
    message: 'Deployment target:',
    choices: [
      { name: '▲ Vercel', value: 'vercel' },
      { name: '◆ Netlify', value: 'netlify' },
      { name: '🚂 Railway', value: 'railway' },
    ],
  });

  const pm = await select<'npm' | 'pnpm' | 'yarn' | 'bun'>({
    message: 'Package manager:',
    choices: [
      { name: 'pnpm (recommended)', value: 'pnpm' },
      { name: 'npm', value: 'npm' },
      { name: 'yarn', value: 'yarn' },
      { name: 'bun', value: 'bun' },
    ],
  });

  const destDir = path.join(process.cwd(), projectName);

  const exists = await access(destDir).then(() => true, () => false);
  if (exists) {
    console.log(chalk.red(`\n✗ Directory "${projectName}" already exists`));
    process.exit(1);
  }

  const spinner = ora(`Scaffolding ${chalk.cyan(projectName)}...`).start();

  // Locate templates bundled with @nodewave/core
  const templateDir = new URL(`../../core/src/templates/${type}`, import.meta.url).pathname;
  await renderTemplate(templateDir, destDir, { projectName, nodeVersion: '22', target });

  // Write nodewave.config.js
  const config = generateDefaultConfig({ name: projectName, type, target });
  await saveConfig(config, destDir);

  spinner.text = `Installing dependencies with ${pm}...`;
  await execa(pm === 'npm' ? 'npm' : pm, pm === 'npm' ? ['install'] : ['install'], {
    cwd: destDir,
    stdio: 'inherit',
  }).catch(() => { /* non-fatal */ });

  spinner.succeed(chalk.green(`Project "${projectName}" created!`));

  console.log(chalk.dim(`\n  ${chalk.cyan('cd')} ${projectName}`));
  console.log(chalk.dim(`  ${chalk.cyan('nodewave dev')}\n`));
}
