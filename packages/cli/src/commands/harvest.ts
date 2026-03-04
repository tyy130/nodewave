// =============================================================================
//  NODEWAVE — CLI — harvest command
// =============================================================================

import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { access as fsAccess, writeFile as fsWriteFile } from 'node:fs/promises';
import { harvest, loadConfig, vercelAdapter, netlifyAdapter, railwayAdapter } from '@nodewave/core';

interface HarvestOptions { cwd: string; target?: string }

const ADAPTERS = { vercel: vercelAdapter, netlify: netlifyAdapter, railway: railwayAdapter } as const;

export async function harvestCommand(opts: HarvestOptions) {
  const cwd = opts.cwd ?? process.cwd();
  console.log(chalk.cyan('\n🌊 nodewave harvest\n'));

  const spinner = ora('Scanning project...').start();
  const result = await harvest(cwd);
  spinner.stop();

  console.log(chalk.bold('Project:'), result.projectName);
  console.log(chalk.bold('Framework:'), result.framework, result.type);
  console.log(chalk.bold('Routes:'), result.routes.length > 0 ? result.routes.join(', ') : chalk.dim('none detected'));
  console.log(chalk.bold('Env (defined):'), result.envVars.defined.join(', ') || chalk.dim('none'));
  console.log(chalk.bold('Env (in source):'), result.envVars.usedInSource.join(', ') || chalk.dim('none'));
  if (result.envVars.missing.length > 0) {
    console.log(chalk.yellow(`Env (missing): ${result.envVars.missing.join(', ')}`));
  }

  const config = await loadConfig(cwd);
  const target = (opts.target ?? config?.target ?? 'vercel') as keyof typeof ADAPTERS;
  const adapter = ADAPTERS[target];

  if (adapter && config) {
    const configContent = adapter.generateConfig(config);
    const configPath = path.join(cwd, adapter.configFile);
    await fsWriteFile(configPath, configContent, 'utf8');
    console.log(chalk.green(`\n✓ Generated ${adapter.configFile}`));
  }
}
