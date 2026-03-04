// =============================================================================
//  ███╗   ██╗ ██████╗ ██████╗ ███████╗██╗    ██╗ █████╗ ██╗   ██╗███████╗
//  ████╗  ██║██╔═══██╗██╔══██╗██╔════╝██║    ██║██╔══██╗██║   ██║██╔════╝
//  ██╔██╗ ██║██║   ██║██║  ██║█████╗  ██║ █╗ ██║███████║██║   ██║█████╗
//  ██║╚██╗██║██║   ██║██║  ██║██╔══╝  ██║███╗██║██╔══██║╚██╗ ██╔╝██╔══╝
//  ██║ ╚████║╚██████╔╝██████╔╝███████╗╚███╔███╔╝██║  ██║ ╚████╔╝ ███████╗
//  ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝  ╚═══╝  ╚══════╝
//  nodewave CLI — HeatWave for Node.js
//  Seamless build, deploy, and upgrade for Next.js + Node.js projects
// =============================================================================

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { buildCommand } from './commands/build.js';
import { devCommand } from './commands/dev.js';
import { deployCommand } from './commands/deploy.js';
import { upgradeCommand } from './commands/upgrade.js';
import { harvestCommand } from './commands/harvest.js';
import { addCommand } from './commands/add.js';
import { configCommand } from './commands/config.js';
import { statusCommand } from './commands/status.js';

const program = new Command();

program
  .name('nodewave')
  .description(
    chalk.cyan('🌊 nodewave') + ' — HeatWave for Node.js\n' +
    'Seamless build, deploy, and upgrade for Next.js + Node.js projects\n' +
    'Compatible with VS Code, Cursor, Codespaces, and any VS Code-compatible IDE'
  )
  .version('0.1.0');

program
  .command('init [name]')
  .description('Scaffold a new project from template')
  .option('-t, --type <type>', 'Project type (nextjs-app, nextjs-pages, express, fastify, fullstack)')
  .option('--target <target>', 'Deployment target (vercel, netlify, railway)', 'vercel')
  .action(initCommand);

program
  .command('build')
  .description('Build the project (auto-detects type)')
  .option('--cwd <path>', 'Working directory', process.cwd())
  .action(buildCommand);

program
  .command('dev')
  .description('Start the development server')
  .option('--cwd <path>', 'Working directory', process.cwd())
  .action(devCommand);

program
  .command('deploy')
  .description('Deploy to Vercel, Netlify, or Railway')
  .option('--target <target>', 'Override deployment target (vercel, netlify, railway)')
  .option('--cwd <path>', 'Working directory', process.cwd())
  .action(deployCommand);

program
  .command('upgrade')
  .description('Upgrade project to latest patterns (App Router, ESM, Next.js version)')
  .option('--cwd <path>', 'Working directory', process.cwd())
  .action(upgradeCommand);

program
  .command('harvest')
  .description('Scan project and generate deployment configuration')
  .option('--cwd <path>', 'Working directory', process.cwd())
  .option('--target <target>', 'Target platform for config generation')
  .action(harvestCommand);

program
  .command('add <package>')
  .description('Add a package and auto-configure it')
  .option('--cwd <path>', 'Working directory', process.cwd())
  .option('-D, --dev', 'Add as devDependency')
  .action(addCommand);

program
  .command('config')
  .description('Interactively edit nodewave.config.js')
  .option('--cwd <path>', 'Working directory', process.cwd())
  .action(configCommand);

program
  .command('status')
  .description('Show project health and deployment status')
  .option('--cwd <path>', 'Working directory', process.cwd())
  .action(statusCommand);

program.parse();
