// =============================================================================
//  NODEWAVE — @nodewave/core — Route Classifier
//  Reads each route/page file and determines its rendering strategy
// =============================================================================

import { fsx as fs } from '../fsx.js';
import path from 'node:path';

export type RouteRuntime = 'edge' | 'nodejs';
export type RouteStrategy = 'edge' | 'isr' | 'static' | 'serverless';

export interface RouteClassification {
  /** relative path from project root, e.g. app/api/users/route.ts */
  file: string;
  /** URL pattern, e.g. /api/users */
  route: string;
  strategy: RouteStrategy;
  runtime: RouteRuntime;
  /** ISR revalidation interval in seconds */
  revalidate?: number;
  /** Detected maxDuration hint (from comment or export) */
  maxDuration?: number;
  /** Detected preferred region */
  region?: string;
  /** Whether this route uses fetch() without cache options (perf warning) */
  hasUncachedFetch: boolean;
  /** Whether this is an API route vs page */
  isApi: boolean;
}

const RUNTIME_RE = /export\s+const\s+runtime\s*=\s*['"](\w+)['"]/;
const DYNAMIC_RE = /export\s+const\s+dynamic\s*=\s*['"]([^'"]+)['"]/;
const REVALIDATE_RE = /export\s+const\s+revalidate\s*=\s*(\d+)/;
const MAX_DURATION_RE = /export\s+const\s+maxDuration\s*=\s*(\d+)/;
const REGION_RE = /export\s+const\s+(?:preferredRegion|region)\s*=\s*['"]([^'"]+)['"]/;
const FETCH_WITH_CACHE_RE = /fetch\s*\([^,)]*,\s*\{[^}]*cache\s*:/;
const GSP_RE = /export\s+(async\s+)?function\s+getStaticProps/;
const GSSP_RE = /export\s+(async\s+)?function\s+getServerSideProps/;
const GENERATE_STATIC_RE = /export\s+(async\s+)?function\s+generateStaticParams/;

export async function classifyRoutes(cwd: string): Promise<RouteClassification[]> {
  const results: RouteClassification[] = [];

  const appDir = await resolveDir(cwd, ['src/app', 'app']);
  const pagesDir = await resolveDir(cwd, ['src/pages', 'pages']);

  if (appDir) {
    const files = await collectRouteFiles(appDir, ['route.ts', 'route.tsx', 'route.js', 'page.tsx', 'page.ts', 'page.jsx', 'page.js']);
    for (const file of files) {
      results.push(await classifyFile(file, path.relative(cwd, file)));
    }
  }

  if (pagesDir) {
    const files = await collectAllFiles(pagesDir, ['.ts', '.tsx', '.js', '.jsx']);
    for (const file of files) {
      const name = path.basename(file);
      if (name.startsWith('_')) continue;
      results.push(await classifyFile(file, path.relative(cwd, file)));
    }
  }

  return results;
}

async function classifyFile(file: string, rel: string): Promise<RouteClassification> {
  const content = await fs.readFile(file, 'utf8').catch(() => '');
  const isApi = rel.includes('/api/') || path.basename(file).startsWith('route.');
  const route = fileToRoute(rel);

  const runtime: RouteRuntime = RUNTIME_RE.exec(content)?.[1] === 'edge' ? 'edge' : 'nodejs';
  const dynamicMode = DYNAMIC_RE.exec(content)?.[1];
  const revalidate = REVALIDATE_RE.exec(content) ? parseInt(REVALIDATE_RE.exec(content)![1], 10) : undefined;
  const maxDuration = MAX_DURATION_RE.exec(content) ? parseInt(MAX_DURATION_RE.exec(content)![1], 10) : undefined;
  const region = REGION_RE.exec(content)?.[1];
  const hasGenerateStatic = GENERATE_STATIC_RE.test(content);
  const hasGSP = GSP_RE.test(content);
  const hasGSSP = GSSP_RE.test(content);

  const fetchCalls = (content.match(/fetch\s*\(/g) ?? []).length;
  const cachedFetches = (content.match(FETCH_WITH_CACHE_RE) ?? []).length;
  const hasUncachedFetch = fetchCalls > 0 && fetchCalls > cachedFetches;

  let strategy: RouteStrategy;
  if (runtime === 'edge') {
    strategy = 'edge';
  } else if (dynamicMode === 'force-static' || hasGSP || hasGenerateStatic) {
    strategy = revalidate !== undefined ? 'isr' : 'static';
  } else if (revalidate !== undefined) {
    strategy = 'isr';
  } else if (hasGSSP || dynamicMode === 'force-dynamic') {
    strategy = 'serverless';
  } else {
    strategy = isApi || fetchCalls > 0 ? 'serverless' : 'static';
  }

  return { file: rel, route, strategy, runtime, revalidate, maxDuration, region, hasUncachedFetch, isApi };
}

async function resolveDir(cwd: string, candidates: string[]): Promise<string | null> {
  for (const c of candidates) {
    const p = path.join(cwd, c);
    if (await fs.pathExists(p)) return p;
  }
  return null;
}

async function collectRouteFiles(dir: string, names: string[]): Promise<string[]> {
  const results: string[] = [];
  async function walk(d: string) {
    const entries = await fs.readdir(d, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else if (names.includes(e.name)) results.push(full);
    }
  }
  await walk(dir);
  return results;
}

async function collectAllFiles(dir: string, exts: string[]): Promise<string[]> {
  const results: string[] = [];
  async function walk(d: string) {
    const entries = await fs.readdir(d, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else if (exts.some(ext => e.name.endsWith(ext))) results.push(full);
    }
  }
  await walk(dir);
  return results;
}

function fileToRoute(rel: string): string {
  return '/' + rel
    .replace(/^(src\/)?(app|pages)\//, '')
    .replace(/\/(route|page)\.(tsx?|jsx?)$/, '')
    .replace(/\.(tsx?|jsx?)$/, '')
    .replace(/\/index$/, '')
    .replace(/\[\.\.\.(\w+)\]/g, ':$1*')
    .replace(/\[(\w+)\]/g, ':$1')
    || '/';
}
