import chalk from 'chalk';
import { select, confirm } from '@inquirer/prompts';
import ora from 'ora';
import {
  detectProjectType, pagesToAppRouter, cjsToEsm, bumpNextVersion,
  transformGetServerSideProps, transformGetStaticProps, transformNextRouter,
  transformNextLink, transformFetchCache,
} from '@nodewave/core';

interface UpgradeOptions { cwd: string }

export async function upgradeCommand(opts: UpgradeOptions) {
  const cwd = opts.cwd ?? process.cwd();
  console.log(chalk.cyan('\n🌊 nodewave upgrade\n'));

  const typeResult = await detectProjectType(cwd);
  const isNext = typeResult.framework.includes('next');
  console.log(chalk.dim(`Detected: ${typeResult.framework} ${typeResult.version ?? ''} (${typeResult.type})\n`));

  const action = await select({
    message: 'What would you like to upgrade?',
    choices: [
      { name: 'Pages Router → App Router', value: 'pages-to-app', disabled: typeResult.type !== 'nextjs-pages' ? '(already App Router or not Next.js)' : false },
      { name: 'getServerSideProps → async Server Component', value: 'gssp', disabled: !isNext ? '(not a Next.js project)' : false },
      { name: 'getStaticProps → fetch cache:force-cache', value: 'gsp', disabled: !isNext ? '(not a Next.js project)' : false },
      { name: 'next/router → next/navigation', value: 'router', disabled: !isNext ? '(not a Next.js project)' : false },
      { name: 'Fix next/link <a> children (Next.js 13+)', value: 'link', disabled: !isNext ? '(not a Next.js project)' : false },
      { name: 'Add cache options to bare fetch() calls', value: 'fetch-cache', disabled: !isNext ? '(not a Next.js project)' : false },
      { name: 'CommonJS → ES Modules', value: 'cjs-to-esm' },
      { name: 'Bump Next.js to latest', value: 'next-version', disabled: !isNext ? '(not a Next.js project)' : false },
    ],
  });

  const ok = await confirm({ message: `Apply upgrade: ${chalk.cyan(action)}? (changes will be written to disk)`, default: true });
  if (!ok) { console.log(chalk.dim('Upgrade cancelled')); return; }

  const spinner = ora('Applying upgrade...').start();

  if (action === 'pages-to-app') {
    const result = await pagesToAppRouter(cwd);
    spinner.succeed('Pages → App Router upgrade applied');
    result.filesChanged.forEach(f => console.log(chalk.green(`  ✓ ${f}`)));
    result.warnings.forEach(w => console.log(chalk.yellow(`  ⚠ ${w}`)));

  } else if (action === 'gssp') {
    const result = await transformGetServerSideProps(cwd);
    spinner.succeed(`getServerSideProps transform complete — ${result.transformed.length} file(s) changed`);
    printTransforms(result);

  } else if (action === 'gsp') {
    const result = await transformGetStaticProps(cwd);
    spinner.succeed(`getStaticProps transform complete — ${result.transformed.length} file(s) changed`);
    printTransforms(result);

  } else if (action === 'router') {
    const result = await transformNextRouter(cwd);
    spinner.succeed(`next/router → next/navigation — ${result.transformed.length} file(s) changed`);
    printTransforms(result);

  } else if (action === 'link') {
    const result = await transformNextLink(cwd);
    spinner.succeed(`next/link <a> children removed — ${result.transformed.length} file(s) changed`);
    printTransforms(result);

  } else if (action === 'fetch-cache') {
    const strategy = await select({
      message: 'Default cache strategy for bare fetch() calls?',
      choices: [
        { name: 'no-store (always fresh — recommended for APIs)', value: 'no-store' },
        { name: 'force-cache (static — good for rarely-changing data)', value: 'force-cache' },
      ],
    });
    const result = await transformFetchCache(cwd, strategy as 'no-store' | 'force-cache');
    spinner.succeed(`fetch() cache options added — ${result.transformed.length} file(s) changed`);
    printTransforms(result);

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

function printTransforms(result: { transformed: { file: string; changes: string[] }[]; warnings: string[] }) {
  for (const t of result.transformed) {
    console.log(chalk.green(`\n  ✓ ${t.file}`));
    t.changes.forEach(c => console.log(`    ${chalk.dim(c)}`));
  }
  result.warnings.forEach(w => console.log(chalk.yellow(`\n  ⚠ ${w}`)));
}
