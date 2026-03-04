// =============================================================================
//  NODEWAVE — @nodewave/core — Doctor
//  Scans for real misconfigurations before they break production
// =============================================================================

import { fsx as fs } from '../fsx.js';
import path from 'node:path';
import { analyzeEnv } from '../env/analyzer.js';
import { classifyRoutes } from '../analyzers/route-classifier.js';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface DoctorIssue {
  severity: IssueSeverity;
  code: string;
  title: string;
  detail: string;
  fix?: string;
  file?: string;
}

export interface DoctorReport {
  issues: DoctorIssue[];
  score: number; // 0-100
  passed: string[];
}

export async function runDoctor(cwd: string): Promise<DoctorReport> {
  const issues: DoctorIssue[] = [];
  const passed: string[] = [];

  await Promise.all([
    checkEnv(cwd, issues, passed),
    checkNextConfig(cwd, issues, passed),
    checkRoutes(cwd, issues, passed),
    checkPackageJson(cwd, issues, passed),
    checkVercelConfig(cwd, issues, passed),
  ]);

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const score = Math.max(0, 100 - errors * 20 - warnings * 5);

  return { issues, score, passed };
}

// ─── Env checks ──────────────────────────────────────────────────────────────

async function checkEnv(cwd: string, issues: DoctorIssue[], passed: string[]) {
  const analysis = await analyzeEnv(cwd);

  if (analysis.missing.length > 0) {
    issues.push({
      severity: 'error',
      code: 'ENV_MISSING',
      title: 'Missing environment variables',
      detail: `Used in source but not defined in any .env file: ${analysis.missing.join(', ')}`,
      fix: `Add to .env.local:\n${analysis.missing.map(k => `${k}=`).join('\n')}`,
    });
  } else {
    passed.push('All env vars referenced in source are defined');
  }

  if (analysis.serverSidePublicLeaks.length > 0) {
    for (const leak of analysis.serverSidePublicLeaks) {
      issues.push({
        severity: 'warning',
        code: 'ENV_PUBLIC_IN_SERVER',
        title: `NEXT_PUBLIC_ var in server file`,
        detail: `${leak.key} is a public (client-exposed) var but referenced in ${leak.file}`,
        fix: `If ${leak.key} contains a secret, rename it to remove the NEXT_PUBLIC_ prefix`,
        file: leak.file,
      });
    }
  }

  if (analysis.unused.length > 0) {
    issues.push({
      severity: 'info',
      code: 'ENV_UNUSED',
      title: 'Unused environment variables',
      detail: `Defined but never referenced in source: ${analysis.unused.join(', ')}`,
      fix: 'Remove from .env files if no longer needed',
    });
  }
}

// ─── next.config.js checks ───────────────────────────────────────────────────

async function checkNextConfig(cwd: string, issues: DoctorIssue[], passed: string[]) {
  const configFiles = ['next.config.js', 'next.config.ts', 'next.config.mjs'];
  let configContent = '';
  let configFile = '';

  for (const f of configFiles) {
    const fp = path.join(cwd, f);
    if (await fs.pathExists(fp)) {
      configContent = await fs.readFile(fp, 'utf8');
      configFile = f;
      break;
    }
  }

  if (!configContent) {
    issues.push({
      severity: 'info',
      code: 'NO_NEXT_CONFIG',
      title: 'No next.config.js found',
      detail: 'Using Next.js defaults. Consider adding a config for production tuning.',
      fix: 'Run: nodewave config',
    });
    return;
  }

  // images.domains deprecated in Next 13+
  if (configContent.includes('images') && configContent.includes('domains:') && !configContent.includes('remotePatterns')) {
    issues.push({
      severity: 'warning',
      code: 'NEXT_IMAGES_DOMAINS_DEPRECATED',
      title: 'images.domains is deprecated',
      detail: 'images.domains was deprecated in Next.js 13. Use images.remotePatterns instead.',
      fix: `Replace:\n  images: { domains: ['example.com'] }\nWith:\n  images: { remotePatterns: [{ protocol: 'https', hostname: 'example.com' }] }`,
      file: configFile,
    });
  } else if (configContent.includes('images')) {
    passed.push('images.remotePatterns is used (not deprecated domains)');
  }

  // outputFileTracingRoot for monorepos
  if (!configContent.includes('outputFileTracingRoot') && await fs.pathExists(path.join(cwd, '..', 'pnpm-workspace.yaml'))) {
    issues.push({
      severity: 'warning',
      code: 'NEXT_MISSING_TRACING_ROOT',
      title: 'Missing outputFileTracingRoot in monorepo',
      detail: 'Detected monorepo but outputFileTracingRoot is not set. Vercel/Railway may bundle wrong files.',
      fix: `Add to next.config.js:\n  output: 'standalone',\n  experimental: { outputFileTracingRoot: path.join(__dirname, '../..') }`,
      file: configFile,
    });
  }

  // swcMinify (removed in Next 15)
  if (configContent.includes('swcMinify')) {
    issues.push({
      severity: 'warning',
      code: 'NEXT_SWC_MINIFY_REMOVED',
      title: 'swcMinify was removed in Next.js 15',
      detail: 'swcMinify is the default in Next.js 15 and the config option was removed.',
      fix: 'Remove swcMinify from your next.config.js',
      file: configFile,
    });
  } else {
    passed.push('next.config.js has no removed options');
  }

  // experimental.appDir (removed in Next 13.4+)
  if (configContent.includes('appDir')) {
    issues.push({
      severity: 'warning',
      code: 'NEXT_APP_DIR_DEPRECATED',
      title: 'experimental.appDir is no longer needed',
      detail: 'App Router is stable since Next.js 13.4. Remove experimental.appDir.',
      fix: 'Remove experimental: { appDir: true } from next.config.js',
      file: configFile,
    });
  }
}

// ─── Route checks ────────────────────────────────────────────────────────────

async function checkRoutes(cwd: string, issues: DoctorIssue[], passed: string[]) {
  const routes = await classifyRoutes(cwd);
  if (routes.length === 0) return;

  const uncachedFetchRoutes = routes.filter(r => r.hasUncachedFetch && r.strategy !== 'edge');
  const forceDynamicStatic = routes.filter(r => r.strategy === 'static');

  if (uncachedFetchRoutes.length > 0) {
    for (const r of uncachedFetchRoutes.slice(0, 5)) {
      issues.push({
        severity: 'warning',
        code: 'ROUTE_UNCACHED_FETCH',
        title: 'fetch() call without cache option',
        detail: `${r.file} uses fetch() without a cache strategy. Every request will hit the origin.`,
        fix: `Add cache option:\n  fetch(url, { cache: 'force-cache' })  // static\n  fetch(url, { next: { revalidate: 60 } })  // ISR\n  fetch(url, { cache: 'no-store' })  // always fresh (intentional)`,
        file: r.file,
      });
    }
  } else if (routes.some(r => r.isApi)) {
    passed.push('All API routes with fetch() have explicit cache options');
  }

  // Edge routes with large dependencies warning
  const edgeRoutes = routes.filter(r => r.runtime === 'edge');
  if (edgeRoutes.length > 0) {
    passed.push(`${edgeRoutes.length} route(s) correctly configured for Edge Runtime`);
  }

  // ISR routes summary
  const isrRoutes = routes.filter(r => r.strategy === 'isr');
  if (isrRoutes.length > 0) {
    passed.push(`${isrRoutes.length} route(s) using ISR (revalidate)`);
  }

  const staticRoutes = forceDynamicStatic.length;
  if (staticRoutes > 0) {
    passed.push(`${staticRoutes} route(s) are fully static`);
  }
}

// ─── package.json checks ─────────────────────────────────────────────────────

async function checkPackageJson(cwd: string, issues: DoctorIssue[], passed: string[]) {
  const pkgPath = path.join(cwd, 'package.json');
  if (!await fs.pathExists(pkgPath)) return;

  const pkg = await fs.readJson(pkgPath) as Record<string, unknown>;
  const deps = { ...(pkg['dependencies'] as Record<string, string> ?? {}), ...(pkg['devDependencies'] as Record<string, string> ?? {}) };

  // next/image: check for deprecated sharp config
  if (deps['next'] && !deps['sharp']) {
    issues.push({
      severity: 'info',
      code: 'MISSING_SHARP',
      title: 'sharp not installed',
      detail: 'Next.js Image Optimization uses sharp for better performance in production.',
      fix: 'npm install sharp',
    });
  } else if (deps['sharp']) {
    passed.push('sharp is installed for image optimization');
  }

  // Check for known conflicting packages
  if (deps['@next/font']) {
    issues.push({
      severity: 'warning',
      code: 'NEXT_FONT_DEPRECATED',
      title: '@next/font is deprecated',
      detail: '@next/font was merged into next/font in Next.js 13.2.',
      fix: 'Uninstall @next/font and use: import { Inter } from "next/font/google"',
    });
  }

  // engines field
  if (!pkg['engines']) {
    issues.push({
      severity: 'info',
      code: 'NO_ENGINES_FIELD',
      title: 'No engines field in package.json',
      detail: 'Specifying a Node.js version prevents unexpected behavior on platforms like Vercel.',
      fix: 'Add to package.json:\n  "engines": { "node": ">=20.0.0" }',
    });
  } else {
    passed.push('engines field specifies Node.js version');
  }
}

// ─── vercel.json checks ──────────────────────────────────────────────────────

async function checkVercelConfig(cwd: string, issues: DoctorIssue[], passed: string[]) {
  const vcPath = path.join(cwd, 'vercel.json');
  if (!await fs.pathExists(vcPath)) {
    issues.push({
      severity: 'info',
      code: 'NO_VERCEL_CONFIG',
      title: 'No vercel.json found',
      detail: 'Vercel uses defaults. Run nodewave harvest to generate an optimized config.',
      fix: 'Run: nodewave harvest',
    });
    return;
  }

  let vc: Record<string, unknown>;
  try {
    vc = await fs.readJson(vcPath) as Record<string, unknown>;
  } catch {
    issues.push({ severity: 'error', code: 'VERCEL_JSON_INVALID', title: 'vercel.json is not valid JSON', detail: 'Parse error in vercel.json', fix: 'Fix JSON syntax in vercel.json', file: 'vercel.json' });
    return;
  }

  // version must be 2
  if (vc['version'] !== 2) {
    issues.push({
      severity: 'error',
      code: 'VERCEL_WRONG_VERSION',
      title: 'vercel.json version should be 2',
      detail: `Found version: ${vc['version']}. Vercel requires version: 2`,
      fix: 'Set "version": 2 in vercel.json',
      file: 'vercel.json',
    });
  } else {
    passed.push('vercel.json version is 2');
  }

  // Deprecated `routes` with Next.js
  if (vc['routes'] && vc['framework'] === 'nextjs') {
    issues.push({
      severity: 'error',
      code: 'VERCEL_ROUTES_WITH_NEXTJS',
      title: 'routes is not supported with Next.js on Vercel',
      detail: 'Using routes in vercel.json conflicts with Next.js routing. Use rewrites/redirects instead.',
      fix: 'Replace "routes" with "rewrites" or "redirects" in vercel.json',
      file: 'vercel.json',
    });
  }
}
