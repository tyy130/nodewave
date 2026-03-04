import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  target: 'node22',
  platform: 'node',
  // Keep all deps external — they live in node_modules and can be resolved at runtime
  // Only inline @nodewave/core which lives in the same monorepo workspace
  external: [
    'commander', '@inquirer/prompts', 'chalk', 'ora', 'execa',
    'node:path', 'node:fs', 'node:fs/promises', 'node:url', 'node:process',
    'zod',
  ],
  noExternal: [/^@nodewave/],
  banner: {
    js: '#!/usr/bin/env node',
  },
});
