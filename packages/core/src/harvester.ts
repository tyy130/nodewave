// =============================================================================
//  NODEWAVE — @nodewave/core — Harvester
//  Scans a project and discovers routes, env vars, and build info
// =============================================================================

import { fsx as fs } from './fsx.js';
import path from 'node:path';
import { detectProjectType } from './detectors/project-type.js';
import { detectEnv } from './detectors/env.js';

export interface HarvestResult {
  projectName: string;
  framework: string;
  type: string;
  routes: string[];
  envVars: {
    defined: string[];
    usedInSource: string[];
    missing: string[];        // used in source but not defined
  };
  buildCommand: string;
  outputDir: string;
}

export async function harvest(cwd: string): Promise<HarvestResult> {
  const [typeResult, envResult] = await Promise.all([
    detectProjectType(cwd),
    detectEnv(cwd),
  ]);

  const pkgPath = path.join(cwd, 'package.json');
  const pkg = await fs.pathExists(pkgPath)
    ? await fs.readJson(pkgPath) as { name?: string }
    : { name: undefined };

  const routes = await discoverRoutes(cwd, typeResult.type);

  const buildMap: Record<string, { cmd: string; out: string }> = {
    'nextjs-app':   { cmd: 'next build', out: '.next' },
    'nextjs-pages': { cmd: 'next build', out: '.next' },
    'express':      { cmd: 'tsc', out: 'dist' },
    'fastify':      { cmd: 'tsc', out: 'dist' },
    'unknown':      { cmd: 'npm run build', out: 'dist' },
  };

  const build = buildMap[typeResult.type] ?? buildMap['unknown'];
  const missing = envResult.usedInSource.filter(k => !envResult.keys.includes(k));

  return {
    projectName: (pkg.name as string) ?? path.basename(cwd),
    framework: typeResult.framework,
    type: typeResult.type,
    routes,
    envVars: {
      defined: envResult.keys,
      usedInSource: envResult.usedInSource,
      missing,
    },
    buildCommand: build.cmd,
    outputDir: build.out,
  };
}

async function discoverRoutes(cwd: string, type: string): Promise<string[]> {
  const routes: string[] = [];
  const isNextJs = type === 'nextjs-app' || type === 'nextjs-pages';

  if (!isNextJs) return routes;

  const routeDir = type === 'nextjs-app'
    ? (await fs.pathExists(path.join(cwd, 'src', 'app')) ? path.join(cwd, 'src', 'app') : path.join(cwd, 'app'))
    : (await fs.pathExists(path.join(cwd, 'src', 'pages')) ? path.join(cwd, 'src', 'pages') : path.join(cwd, 'pages'));

  if (!await fs.pathExists(routeDir)) return routes;

  await walkRouteDir(routeDir, routeDir, routes, type);
  return routes.sort();
}

async function walkRouteDir(base: string, dir: string, routes: string[], type: string): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = '/' + path.relative(base, full).replace(/\\/g, '/');
    if (entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.')) {
      await walkRouteDir(base, full, routes, type);
    } else if (entry.isFile()) {
      if (type === 'nextjs-app' && entry.name === 'page.tsx' || entry.name === 'page.ts' || entry.name === 'page.jsx' || entry.name === 'page.js') {
        const routePath = path.dirname(rel).replace(/\\/g, '/');
        routes.push(routePath || '/');
      } else if (type === 'nextjs-pages' && /\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.startsWith('_')) {
        routes.push(rel.replace(/\.(tsx?|jsx?)$/, '').replace(/\/index$/, '/'));
      }
    }
  }
}
