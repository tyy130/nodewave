// =============================================================================
//  NODEWAVE — CLI — env command
//  Analyze, list, and sync environment variables
// =============================================================================

import chalk from 'chalk';
import { execa } from 'execa';
import { analyzeEnv } from '@nodewave/core';

interface EnvOptions { cwd: string; target?: string }

export async function envCommand(sub: string, opts: EnvOptions) {
  const cwd = opts.cwd ?? process.cwd();
  console.log(chalk.cyan('\n🌊 nodewave env\n'));

  switch (sub) {
    case 'list':
    case undefined:
      return envList(cwd);
    case 'sync':
      return envSync(cwd, opts.target ?? 'vercel');
    case 'pull':
      return envPull(cwd, opts.target ?? 'vercel');
    default:
      console.error(chalk.red(`Unknown subcommand: ${sub}. Use list, sync, or pull`));
      process.exit(1);
  }
}

async function envList(cwd: string) {
  const analysis = await analyzeEnv(cwd);

  console.log(chalk.bold('Defined vars:\n'));
  if (analysis.vars.length === 0) {
    console.log(chalk.dim('  No .env files found'));
  } else {
    for (const v of analysis.vars) {
      const badge = v.isPublic ? chalk.blue('[public]') : chalk.dim('[server]');
      const status = v.hasValue ? chalk.green('✓') : chalk.yellow('⚠ empty');
      console.log(`  ${status} ${badge} ${v.key}  ${chalk.dim(v.source)}`);
    }
  }

  if (analysis.missing.length > 0) {
    console.log(chalk.red('\n✗ Missing (used in source, not defined):\n'));
    analysis.missing.forEach(k => console.log(`  ${chalk.red('✗')} ${k}`));
  }

  if (analysis.serverSidePublicLeaks.length > 0) {
    console.log(chalk.yellow('\n⚠ Potential leaks (NEXT_PUBLIC_ in server files):\n'));
    analysis.serverSidePublicLeaks.forEach(l =>
      console.log(`  ${chalk.yellow('⚠')} ${l.key}  ${chalk.dim(l.file)}`));
  }

  if (analysis.unused.length > 0) {
    console.log(chalk.dim('\nUnused (defined but never referenced):\n'));
    analysis.unused.forEach(k => console.log(`  ${chalk.dim('○')} ${chalk.dim(k)}`));
  }

  const summary = [
    chalk.green(`${analysis.vars.length} defined`),
    analysis.missing.length ? chalk.red(`${analysis.missing.length} missing`) : null,
    analysis.serverSidePublicLeaks.length ? chalk.yellow(`${analysis.serverSidePublicLeaks.length} leak warnings`) : null,
  ].filter(Boolean).join('  ');
  console.log(`\n${summary}\n`);
}

async function envSync(cwd: string, target: string) {
  const analysis = await analyzeEnv(cwd);

  if (analysis.vars.length === 0) {
    console.log(chalk.yellow('No .env vars found to sync'));
    return;
  }

  const separator = chalk.dim('─'.repeat(50));

  if (target === 'vercel') {
    console.log(chalk.dim(`Syncing ${analysis.vars.length} vars to Vercel...\n`));
    console.log(`${separator}\n  from vercel cli:\n${separator}\n`);

    for (const v of analysis.vars) {
      if (!v.hasValue) continue;
      try {
        await execa('vercel', ['env', 'add', v.key, 'production'], { cwd, stdio: 'inherit' });
      } catch {
        console.log(chalk.dim(`  skipped ${v.key} (already set or vercel CLI not authenticated)`));
      }
    }
  } else if (target === 'railway') {
    console.log(`${separator}\n  from railway cli:\n${separator}\n`);
    for (const v of analysis.vars) {
      if (!v.hasValue) continue;
      try {
        await execa('railway', ['variables', 'set', `${v.key}=<value>`], { cwd, stdio: 'inherit' });
      } catch {
        console.log(chalk.dim(`  skipped ${v.key}`));
      }
    }
  } else {
    console.log(chalk.yellow(`env sync is not yet supported for ${target}. Supported: vercel, railway`));
  }
}

async function envPull(cwd: string, target: string) {
  const separator = chalk.dim('─'.repeat(50));

  if (target === 'vercel') {
    console.log(chalk.dim('Pulling env from Vercel into .env.local...\n'));
    console.log(`${separator}\n  from vercel cli:\n${separator}\n`);
    await execa('vercel', ['env', 'pull', '.env.local'], { cwd, stdio: 'inherit' });
  } else if (target === 'railway') {
    console.log(chalk.dim('Pulling env from Railway...\n'));
    console.log(`${separator}\n  from railway cli:\n${separator}\n`);
    await execa('railway', ['variables'], { cwd, stdio: 'inherit' });
  } else {
    console.log(chalk.yellow(`env pull not supported for ${target}`));
  }
}
