// =============================================================================
//  ███╗   ██╗ ██████╗ ██████╗ ███████╗██╗    ██╗ █████╗ ██╗   ██╗███████╗
//  ████╗  ██║██╔═══██╗██╔══██╗██╔════╝██║    ██║██╔══██╗██║   ██║██╔════╝
//  ██╔██╗ ██║██║   ██║██║  ██║█████╗  ██║ █╗ ██║███████║██║   ██║█████╗
//  ██║╚██╗██║██║   ██║██║  ██║██╔══╝  ██║███╗██║██╔══██║╚██╗ ██╔╝██╔══╝
//  ██║ ╚████║╚██████╔╝██████╔╝███████╗╚███╔███╔╝██║  ██║ ╚████╔╝ ███████╗
//  ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝  ╚═══╝  ╚══════╝
//  @nodewave/core — Detectors
//  Detect project type from package.json and file tree
// =============================================================================

import { fsx as fs } from '../fsx.js';
import path from 'node:path';

export type ProjectType =
  | 'nextjs-app'
  | 'nextjs-pages'
  | 'express'
  | 'fastify'
  | 'unknown';

export interface ProjectTypeResult {
  type: ProjectType;
  framework: string;
  version: string | null;
}

export async function detectProjectType(cwd: string): Promise<ProjectTypeResult> {
  const pkgPath = path.join(cwd, 'package.json');

  if (!await fs.pathExists(pkgPath)) {
    return { type: 'unknown', framework: 'unknown', version: null };
  }

  const pkg = await fs.readJson(pkgPath) as Record<string, unknown>;
  const deps = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };

  // Next.js detection
  if ('next' in deps) {
    const appDir = await fs.pathExists(path.join(cwd, 'app')) ||
                   await fs.pathExists(path.join(cwd, 'src', 'app'));
    const pagesDir = await fs.pathExists(path.join(cwd, 'pages')) ||
                     await fs.pathExists(path.join(cwd, 'src', 'pages'));

    const type: ProjectType = (appDir && !pagesDir) ? 'nextjs-app' : 'nextjs-pages';
    return { type, framework: 'next', version: (deps['next'] as string) ?? null };
  }

  if ('fastify' in deps) {
    return { type: 'fastify', framework: 'fastify', version: (deps['fastify'] as string) ?? null };
  }

  if ('express' in deps) {
    return { type: 'express', framework: 'express', version: (deps['express'] as string) ?? null };
  }

  return { type: 'unknown', framework: 'unknown', version: null };
}
