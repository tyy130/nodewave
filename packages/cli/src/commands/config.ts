// =============================================================================
//  NODEWAVE — CLI — config command
// =============================================================================

import chalk from 'chalk';
import { select, input, confirm } from '@inquirer/prompts';
import { loadConfig, saveConfig, generateDefaultConfig, detectProjectType } from '@nodewave/core';

interface ConfigOptions { cwd: string }

export async function configCommand(opts: ConfigOptions) {
  const cwd = opts.cwd ?? process.cwd();
  console.log(chalk.cyan('\n🌊 nodewave config\n'));

  let config = await loadConfig(cwd);

  if (!config) {
    const typeResult = await detectProjectType(cwd);
    config = generateDefaultConfig({ name: 'my-app', type: typeResult.type, target: 'vercel' });
    console.log(chalk.dim('No nodewave.config.js found — using detected defaults\n'));
  }

  // Edit fields interactively
  config.project = await input({ message: 'Project name:', default: config.project });

  config.target = await select({
    message: 'Deployment target:',
    choices: [
      { name: '▲ Vercel', value: 'vercel' },
      { name: '◆ Netlify', value: 'netlify' },
      { name: '🚂 Railway', value: 'railway' },
    ],
    default: config.target,
  });

  config.build.command = await input({ message: 'Build command:', default: config.build.command });
  config.build.output = await input({ message: 'Output directory:', default: config.build.output });
  config.deploy.region = await input({ message: 'Deploy region:', default: config.deploy.region });
  config.deploy.nodeVersion = await input({ message: 'Node.js version:', default: config.deploy.nodeVersion });

  const ok = await confirm({ message: 'Save nodewave.config.js?', default: true });
  if (ok) {
    await saveConfig(config, cwd);
    console.log(chalk.green('\n✓ nodewave.config.js saved'));
  } else {
    console.log(chalk.dim('Cancelled'));
  }
}
