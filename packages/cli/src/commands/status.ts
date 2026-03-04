// =============================================================================
//  NODEWAVE — CLI — status command
// =============================================================================

import chalk from 'chalk';
import { access as fsAccess, writeFile as fsWriteFile } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, detectProjectType, harvest } from '@nodewave/core';

interface StatusOptions { cwd: string }

export async function statusCommand(opts: StatusOptions) {
  const cwd = opts.cwd ?? process.cwd();
  console.log(chalk.cyan('\n🌊 nodewave status\n'));

  const [config, typeResult, harvestResult] = await Promise.all([
    loadConfig(cwd),
    detectProjectType(cwd),
    harvest(cwd),
  ]);

  const targetIcon: Record<string, string> = { vercel: '▲', netlify: '◆', railway: '🚂' };
  const target = config?.target ?? 'not configured';
  const icon = targetIcon[target] ?? '?';

  console.log(chalk.bold('Project:    ') + harvestResult.projectName);
  console.log(chalk.bold('Framework:  ') + typeResult.framework + (typeResult.version ? ` ${typeResult.version}` : ''));
  console.log(chalk.bold('Type:       ') + typeResult.type);
  console.log(chalk.bold('Target:     ') + chalk.cyan(`${icon} ${target}`));
  console.log(chalk.bold('Routes:     ') + (harvestResult.routes.length > 0 ? harvestResult.routes.length + ' discovered' : chalk.dim('none')));
  console.log(chalk.bold('Config:     ') + (config ? chalk.green('✓ nodewave.config.js') : chalk.yellow('⚠ not found (run nodewave config)')));

  // Check for env issues
  if (harvestResult.envVars.missing.length > 0) {
    console.log(chalk.yellow(`\n⚠ Missing env vars: ${harvestResult.envVars.missing.join(', ')}`));
  } else {
    console.log(chalk.green('\n✓ No missing env vars detected'));
  }

  // Check for deploy config files
  const deployFiles = ['vercel.json', 'netlify.toml', 'railway.json'];
  const found = (await Promise.all(deployFiles.map(async f => ({
    file: f,
    exists: await fsAccess(path.join(cwd, f)).then(() => true, () => false),
  })))).filter(x => x.exists);

  if (found.length > 0) {
    console.log(chalk.bold('\nDeploy configs: ') + found.map(f => chalk.green(f.file)).join(', '));
  } else {
    console.log(chalk.dim('\nNo deploy config files found — run nodewave harvest'));
  }

  console.log('');
}
