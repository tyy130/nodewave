// =============================================================================
//  NODEWAVE — @nodewave/core — Vercel Adapter
// =============================================================================

import type { NodewaveConfig } from '../config.js';
import type { RouteClassification } from '../analyzers/route-classifier.js';

export interface VercelFunctionConfig {
  runtime?: string;
  maxDuration?: number;
  memory?: number;
  regions?: string[];
}

export interface DeepVercelConfig {
  version: 2;
  framework?: string | null;
  buildCommand?: string;
  outputDirectory?: string;
  regions?: string[];
  functions?: Record<string, VercelFunctionConfig>;
  headers?: unknown[];
  rewrites?: unknown[];
  redirects?: unknown[];
  env?: Record<string, string>;
}

export function generateConfig(config: NodewaveConfig, routes?: RouteClassification[]): string {
  const isNextJs = config.type === 'nextjs-app' || config.type === 'nextjs-pages';

  const out: DeepVercelConfig = {
    version: 2,
    framework: isNextJs ? 'nextjs' : null,
    buildCommand: config.build.command,
    outputDirectory: config.build.output,
    regions: [config.deploy.region],
  };

  if (!isNextJs) {
    // Express/Fastify: single function catch-all
    (out as unknown as Record<string, unknown>)['builds'] = [{ src: 'dist/index.js', use: '@vercel/node' }];
    (out as unknown as Record<string, unknown>)['routes'] = [{ src: '/(.*)', dest: '/dist/index.js' }];
    return JSON.stringify(out, null, 2);
  }

  if (routes && routes.length > 0) {
    const functions: Record<string, VercelFunctionConfig> = {};

    for (const r of routes) {
      const fnConfig: VercelFunctionConfig = {};
      let hasConfig = false;

      if (r.runtime === 'edge') {
        fnConfig.runtime = 'edge';
        hasConfig = true;
      }
      if (r.maxDuration) {
        fnConfig.maxDuration = r.maxDuration;
        hasConfig = true;
      }
      if (r.region) {
        fnConfig.regions = [r.region];
        hasConfig = true;
      }

      if (hasConfig) functions[r.file] = fnConfig;
    }

    if (Object.keys(functions).length > 0) out.functions = functions;
  }

  return JSON.stringify(out, null, 2);
}

export const name = 'Vercel';
export const configFile = 'vercel.json';
export const icon = '▲';

