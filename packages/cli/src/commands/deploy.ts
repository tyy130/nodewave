// =============================================================================
//  NODEWAVE — CLI — deploy command
// =============================================================================

import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { access as fsAccess, writeFile as fsWriteFile } from 'node:fs/promises';
import { execa } from 'execa';
import {
  loadConfig,
  harvest,
  vercelAdapter,
  netlifyAdapter,
  railwayAdapter,
  saveConfig,
  generateDefaultConfig,
  detectProjectType,
} from '@nodewave/core';

interface DeployOptions { target?: string; cwd: string }

const ADAPTERS = {
  vercel: vercelAdapter,
  netlify: netlifyAdapter,
  railway: railwayAdapter,
} as const;

type Target = keyof typeof ADAPTERS;

export async function deployCommand(opts: DeployOptions) {
  const cwd = opts.cwd ?? process.cwd();
  console.log(chalk.cyan('\n🌊 nodewave deploy\n'));

  let config = await loadConfig(cwd);
  const target = (opts.target ?? config?.target ?? 'vercel') as Target;
  const adapter = ADAPTERS[target];

  if (!adapter) {
    console.error(chalk.red(`Unknown target: ${target}. Use vercel, netlify, or railway`));
    process.exit(1);
  }

  // Auto-harvest if no config
  if (!config) {
    const spinner = ora('Detecting project...').start();
    const result = await harvest(cwd);
    const typeResult = await detectProjectType(cwd);
    config = generateDefaultConfig({ name: result.projectName, type: typeResult.type, target });
    await saveConfig(config, cwd);
    spinner.succeed(chalk.dim('Generated nodewave.config.js'));
  }

  // Write deployment platform config
  const configContent = adapter.generateConfig(config);
  const configPath = path.join(cwd, adapter.configFile);
  await fsWriteFile(configPath, configContent, 'utf8');
  console.log(chalk.dim(`  ✓ Wrote ${adapter.configFile}`));

  // Deploy
  const deploySpinner = ora(`Deploying to ${chalk.cyan(adapter.icon + ' ' + adapter.name)}...`).start();
  deploySpinner.stop();

  const deployCmd = getDeployCLI(target);
  console.log(chalk.dim(`\nRunning: ${deployCmd}\n`));

  try {
    const [bin, ...args] = deployCmd.split(' ');
    await execa(bin, args, { cwd, stdio: 'inherit' });
    console.log(chalk.green(`\n✓ Deployed to ${target}!`));
  } catch {
    console.error(chalk.red(`\n✗ Deployment failed. Make sure ${getCliName(target)} is installed and authenticated.`));
    console.error(chalk.dim(`  Install: npm i -g ${getCliName(target)}`));
    process.exit(1);
  }
}

function getDeployCLI(target: Target): string {
  const map: Record<Target, string> = {
    vercel: 'vercel --prod',
    netlify: 'netlify deploy --prod',
    railway: 'railway up',
  };
  return map[target];
}

function getCliName(target: Target): string {
  const map: Record<Target, string> = {
    vercel: 'vercel',
    netlify: 'netlify-cli',
    railway: '@railway/cli',
  };
  return map[target];
}
