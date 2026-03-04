// =============================================================================
//  NODEWAVE — CLI — doctor command
//  Scan for real misconfigurations before they break production
// =============================================================================

import chalk from 'chalk';
import { runDoctor } from '@nodewave/core';
import type { DoctorIssue } from '@nodewave/core';

interface DoctorOptions { cwd: string }

const SEVERITY_ICON: Record<string, string> = {
  error: chalk.red('✗'),
  warning: chalk.yellow('⚠'),
  info: chalk.blue('ℹ'),
};

const SEVERITY_COLOR: Record<string, (s: string) => string> = {
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
};

export async function doctorCommand(opts: DoctorOptions) {
  const cwd = opts.cwd ?? process.cwd();
  console.log(chalk.cyan('\n🌊 nodewave doctor\n'));
  console.log(chalk.dim('Scanning project...\n'));

  const report = await runDoctor(cwd);

  // Passed checks
  if (report.passed.length > 0) {
    report.passed.forEach(p => console.log(`  ${chalk.green('✓')} ${chalk.dim(p)}`));
    console.log();
  }

  // Issues grouped by severity
  const errors = report.issues.filter(i => i.severity === 'error');
  const warnings = report.issues.filter(i => i.severity === 'warning');
  const infos = report.issues.filter(i => i.severity === 'info');

  printIssues(errors);
  printIssues(warnings);
  printIssues(infos);

  // Score
  const scoreColor = report.score >= 80 ? chalk.green : report.score >= 50 ? chalk.yellow : chalk.red;
  const bar = buildBar(report.score);
  console.log(`\n  Health score: ${scoreColor(`${report.score}/100`)}  ${bar}\n`);

  if (report.issues.length === 0) {
    console.log(chalk.green('  ✓ No issues found — project looks healthy!\n'));
  } else {
    const parts = [
      errors.length ? chalk.red(`${errors.length} error${errors.length > 1 ? 's' : ''}`) : null,
      warnings.length ? chalk.yellow(`${warnings.length} warning${warnings.length > 1 ? 's' : ''}`) : null,
      infos.length ? chalk.blue(`${infos.length} suggestion${infos.length > 1 ? 's' : ''}`) : null,
    ].filter(Boolean);
    console.log(`  ${parts.join('  ')}\n`);
  }

  if (errors.length > 0) process.exit(1);
}

function printIssues(issues: DoctorIssue[]) {
  for (const issue of issues) {
    const icon = SEVERITY_ICON[issue.severity];
    const color = SEVERITY_COLOR[issue.severity];
    console.log(`  ${icon} ${color(issue.title)}${issue.file ? chalk.dim(`  [${issue.file}]`) : ''}`);
    console.log(`     ${chalk.dim(issue.detail)}`);
    if (issue.fix) {
      const fixLines = issue.fix.split('\n');
      console.log(`     ${chalk.cyan('→')} ${fixLines[0]}`);
      fixLines.slice(1).forEach(l => console.log(`       ${chalk.dim(l)}`));
    }
    console.log();
  }
}

function buildBar(score: number): string {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  const color = score >= 80 ? chalk.green : score >= 50 ? chalk.yellow : chalk.red;
  return color('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}
