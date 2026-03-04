// =============================================================================
//  NODEWAVE — @nodewave/core — Vercel Adapter
// =============================================================================

import type { NodewaveConfig } from '../config.js';

export function generateConfig(config: NodewaveConfig): string {
  const isNextJs = config.type === 'nextjs-app' || config.type === 'nextjs-pages';

  const vercelConfig: Record<string, unknown> = {
    version: 2,
    buildCommand: config.build.command,
    outputDirectory: config.build.output,
    framework: isNextJs ? 'nextjs' : null,
    regions: [config.deploy.region],
  };

  if (!isNextJs) {
    vercelConfig['builds'] = [
      { src: 'dist/index.js', use: '@vercel/node' },
    ];
    vercelConfig['routes'] = [
      { src: '/(.*)', dest: '/dist/index.js' },
    ];
  }

  return JSON.stringify(vercelConfig, null, 2);
}

export const name = 'vercel';
export const configFile = 'vercel.json';
export const icon = '▲';
