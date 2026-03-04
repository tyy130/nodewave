// =============================================================================
//  NODEWAVE — @nodewave/core — Railway Adapter
// =============================================================================

import type { NodewaveConfig } from '../config.js';

export function generateConfig(config: NodewaveConfig): string {
  const railwayConfig = {
    build: {
      builder: 'NIXPACKS',
      buildCommand: config.build.command,
    },
    deploy: {
      startCommand: config.type === 'nextjs-app' || config.type === 'nextjs-pages'
        ? 'next start'
        : `node dist/index.js`,
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 10,
    },
  };

  return JSON.stringify(railwayConfig, null, 2);
}

export function generateDockerfile(config: NodewaveConfig): string {
  const isNextJs = config.type === 'nextjs-app' || config.type === 'nextjs-pages';
  const startCmd = isNextJs ? 'next start' : 'node dist/index.js';

  return `FROM node:${config.deploy.nodeVersion}-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN ${config.build.command}

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/${config.build.output} ./${config.build.output}
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["${startCmd}"]
`;
}

export const name = 'railway';
export const configFile = 'railway.json';
export const icon = '🚂';
