import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { writeFile as fsWriteFile } from 'node:fs/promises';
import { harvest, loadConfig, vercelAdapter, netlifyAdapter, railwayAdapter, classifyRoutes } from '@nodewave/core';

interface HarvestOptions { cwd: string; target?: string }

const ADAPTERS = { vercel: vercelAdapter, netlify: netlifyAdapter, railway: railwayAdapter } as const;

const STRATEGY_BADGE: Record<string, string> = {
  edge: chalk.blue('[edge]'),
  isr: chalk.cyan('[isr]'),
  static: chalk.green('[static]'),
  serverless: chalk.dim('[serverless]'),
};

export async function harvestCommand(opts: HarvestOptions) {
  const cwd = opts.cwd ?? process.cwd();
  console.log(chalk.cyan('\n🌊 nodewave harvest\n'));

  const spinner = ora('Scanning project...').start();
  const [result, routes] = await Promise.all([harvest(cwd), classifyRoutes(cwd)]);
  spinner.stop();

  console.log(chalk.bold('Project:'), result.projectName);
  console.log(chalk.bold('Framework:'), result.framework, result.type);
  console.log();

  if (routes.length > 0) {
    console.log(chalk.bold('Routes:\n'));
    for (const r of routes) {
      const badge = STRATEGY_BADGE[r.strategy] ?? '';
      const warn = r.hasUncachedFetch ? chalk.yellow(' ⚠ uncached fetch') : '';
      const reval = r.revalidate !== undefined ? chalk.dim(` revalidate:${r.revalidate}s`) : '';
      console.log(`  ${badge} ${r.route}${reval}${warn}  ${chalk.dim(r.file)}`);
    }
    console.log();
    const edgeCount = routes.filter(r => r.strategy === 'edge').length;
    const isrCount = routes.filter(r => r.strategy === 'isr').length;
    const staticCount = routes.filter(r => r.strategy === 'static').length;
    const serverlessCount = routes.filter(r => r.strategy === 'serverless').length;
    const uncachedCount = routes.filter(r => r.hasUncachedFetch).length;
    const parts = [
      staticCount ? chalk.green(`${staticCount} static`) : null,
      isrCount ? chalk.cyan(`${isrCount} ISR`) : null,
      edgeCount ? chalk.blue(`${edgeCount} edge`) : null,
      serverlessCount ? chalk.dim(`${serverlessCount} serverless`) : null,
      uncachedCount ? chalk.yellow(`${uncachedCount} uncached fetch`) : null,
    ].filter(Boolean);
    console.log(`  ${parts.join('  ')}\n`);
  } else {
    console.log(chalk.bold('Routes:'), chalk.dim('none detected'), '\n');
  }

  if (result.envVars.missing.length > 0) {
    console.log(chalk.yellow(`⚠ Missing env vars: ${result.envVars.missing.join(', ')}`));
    console.log(chalk.dim('  Run: nodewave env list\n'));
  }

  const config = await loadConfig(cwd);
  const target = (opts.target ?? config?.target ?? 'vercel') as keyof typeof ADAPTERS;
  const adapter = ADAPTERS[target];

  if (adapter && config) {
    // Pass route classifications to vercel adapter for per-function config
    const configContent = target === 'vercel'
      ? vercelAdapter.generateConfig(config, routes)
      : adapter.generateConfig(config);
    const configPath = path.join(cwd, adapter.configFile);
    await fsWriteFile(configPath, configContent, 'utf8');
    console.log(chalk.green(`✓ Generated ${adapter.configFile}`));

    // Show what was configured
    const fnCount = routes.filter(r => r.runtime === 'edge' || r.maxDuration || r.region).length;
    if (fnCount > 0) {
      console.log(chalk.dim(`  ${fnCount} function(s) with custom config (edge runtime / maxDuration / region)`));
    }
  }
  console.log();
}
