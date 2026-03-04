// =============================================================================
//  NODEWAVE — @nodewave/core — Netlify Adapter
// =============================================================================

import type { NodewaveConfig } from '../config.js';

export function generateConfig(config: NodewaveConfig): string {
  const isNextJs = config.type === 'nextjs-app' || config.type === 'nextjs-pages';

  const lines: string[] = [
    '[build]',
    `  command = "${config.build.command}"`,
    `  publish = "${config.build.output}"`,
    '',
  ];

  if (isNextJs) {
    lines.push('[build.environment]', `  NODE_VERSION = "${config.deploy.nodeVersion}"`, '');
    lines.push('[[plugins]]', '  package = "@netlify/plugin-nextjs"', '');
  } else {
    lines.push('[build.environment]', `  NODE_VERSION = "${config.deploy.nodeVersion}"`, '');
    lines.push('[[redirects]]', '  from = "/*"', '  to = "/.netlify/functions/server"', '  status = 200', '');
  }

  return lines.join('\n');
}

export const name = 'netlify';
export const configFile = 'netlify.toml';
export const icon = '◆';
