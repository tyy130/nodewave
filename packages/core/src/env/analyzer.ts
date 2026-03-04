// =============================================================================
//  NODEWAVE — @nodewave/core — Env Manager
//  Analyze, validate, and sync environment variables
// =============================================================================

import { fsx as fs } from '../fsx.js';
import path from 'node:path';

export interface EnvVar {
  key: string;
  /** Which .env file it came from */
  source: string;
  /** Whether it's a NEXT_PUBLIC_ var */
  isPublic: boolean;
  hasValue: boolean;
}

export interface EnvAnalysis {
  vars: EnvVar[];
  /** Vars used in source but not in any .env file */
  missing: string[];
  /** NEXT_PUBLIC_ vars referenced in server-side files (potential leak) */
  serverSidePublicLeaks: { key: string; file: string }[];
  /** Vars defined but never used in source */
  unused: string[];
  /** Vars used in source */
  usedInSource: string[];
}

const ENV_FILE_PRIORITY = [
  '.env.local',
  '.env.development.local',
  '.env.production.local',
  '.env.development',
  '.env.production',
  '.env',
];

const SERVER_DIRS = ['app', 'src/app', 'pages/api', 'src/pages/api', 'lib', 'src/lib', 'server', 'src/server'];

export async function analyzeEnv(cwd: string): Promise<EnvAnalysis> {
  const vars: EnvVar[] = [];
  const seen = new Set<string>();

  // Parse all .env files
  for (const envFile of ENV_FILE_PRIORITY) {
    const filePath = path.join(cwd, envFile);
    if (!await fs.pathExists(filePath)) continue;
    const content = await fs.readFile(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!seen.has(key)) {
        seen.add(key);
        vars.push({ key, source: envFile, isPublic: key.startsWith('NEXT_PUBLIC_'), hasValue: val.length > 0 });
      }
    }
  }

  // Find all vars used in source
  const usedInSource = await findEnvUsageInSource(cwd);

  // Missing: used but not defined
  const definedKeys = new Set(vars.map(v => v.key));
  const missing = usedInSource.filter(k => !definedKeys.has(k));

  // Unused: defined but not used
  const usedSet = new Set(usedInSource);
  const unused = vars.map(v => v.key).filter(k => !usedSet.has(k));

  // NEXT_PUBLIC_ leaks: public vars referenced in server-side files
  const serverSidePublicLeaks = await findPublicVarLeaks(cwd, vars.filter(v => v.isPublic).map(v => v.key));

  return { vars, missing, serverSidePublicLeaks, unused, usedInSource };
}

async function findEnvUsageInSource(cwd: string): Promise<string[]> {
  const used = new Set<string>();
  const srcDirs = ['src', 'app', 'pages', 'lib', 'components', 'server'].map(d => path.join(cwd, d));
  const exts = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

  // Also check root-level config files
  const rootFiles = ['next.config.js', 'next.config.ts', 'vite.config.ts', 'server.ts', 'index.ts'];
  for (const f of rootFiles) {
    const fp = path.join(cwd, f);
    if (await fs.pathExists(fp)) {
      extractEnvRefs(await fs.readFile(fp, 'utf8')).forEach(k => used.add(k));
    }
  }

  for (const dir of srcDirs) {
    if (!await fs.pathExists(dir)) continue;
    await walkForEnv(dir, exts, used);
  }

  return [...used];
}

async function walkForEnv(dir: string, exts: string[], used: Set<string>) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.next') {
      await walkForEnv(full, exts, used);
    } else if (exts.some(ext => e.name.endsWith(ext))) {
      const content = await fs.readFile(full, 'utf8').catch(() => '');
      extractEnvRefs(content).forEach(k => used.add(k));
    }
  }
}

function extractEnvRefs(content: string): string[] {
  const keys: string[] = [];
  // process.env.SOME_VAR or process.env['SOME_VAR']
  const re = /process\.env(?:\[['"]([A-Z0-9_]+)['"]\]|\.([A-Z0-9_]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const key = m[1] ?? m[2];
    if (key) keys.push(key);
  }
  return keys;
}

async function findPublicVarLeaks(cwd: string, publicKeys: string[]): Promise<{ key: string; file: string }[]> {
  if (publicKeys.length === 0) return [];
  const leaks: { key: string; file: string }[] = [];
  const exts = ['.ts', '.tsx', '.js', '.jsx'];

  for (const serverDir of SERVER_DIRS) {
    const dir = path.join(cwd, serverDir);
    if (!await fs.pathExists(dir)) continue;

    await walkForLeaks(dir, exts, publicKeys, leaks, cwd);
  }

  return leaks;
}

async function walkForLeaks(
  dir: string,
  exts: string[],
  publicKeys: string[],
  leaks: { key: string; file: string }[],
  cwd: string,
) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walkForLeaks(full, exts, publicKeys, leaks, cwd);
    } else if (exts.some(ext => e.name.endsWith(ext))) {
      const content = await fs.readFile(full, 'utf8').catch(() => '');
      // In server files, NEXT_PUBLIC_ vars are fine to USE but flag if they contain secrets
      // Real leak: user accidentally put a secret in a NEXT_PUBLIC_ var and it shows up in client bundle
      // We detect: NEXT_PUBLIC_ vars referenced in files that also have 'use server' or are in /api/
      const isServerFile = content.includes("'use server'") || full.includes('/api/');
      if (isServerFile) {
        for (const key of publicKeys) {
          if (content.includes(key)) {
            leaks.push({ key, file: path.relative(cwd, full) });
          }
        }
      }
    }
  }
}

/** Parse a single .env file into a key→value map */
export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = val;
  }
  return result;
}
