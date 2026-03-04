// =============================================================================
//  NODEWAVE — @nodewave/core — Environment Variable Detector
// =============================================================================

import { fsx as fs } from '../fsx.js';
import path from 'node:path';

export interface EnvResult {
  files: string[];          // .env, .env.local, .env.example, etc.
  keys: string[];           // all keys found across env files
  usedInSource: string[];   // keys referenced via process.env in source
}

const ENV_FILE_PATTERNS = ['.env', '.env.local', '.env.example', '.env.production', '.env.development'];
const PROCESS_ENV_RE = /process\.env\.([A-Z_][A-Z0-9_]*)/g;

export async function detectEnv(cwd: string): Promise<EnvResult> {
  const files: string[] = [];
  const keysSet = new Set<string>();

  for (const f of ENV_FILE_PATTERNS) {
    const fp = path.join(cwd, f);
    if (await fs.pathExists(fp)) {
      files.push(f);
      const content = await fs.readFile(fp, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const key = trimmed.split('=')[0].trim();
          if (key) keysSet.add(key);
        }
      }
    }
  }

  // Scan source files for process.env usage
  const usedSet = new Set<string>();
  const srcDirs = ['src', 'app', 'pages', 'lib', 'utils', 'components'].map(d => path.join(cwd, d));

  for (const dir of srcDirs) {
    if (await fs.pathExists(dir)) {
      await scanDirForEnvRefs(dir, usedSet);
    }
  }

  return {
    files,
    keys: Array.from(keysSet),
    usedInSource: Array.from(usedSet),
  };
}

async function scanDirForEnvRefs(dir: string, found: Set<string>): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      await scanDirForEnvRefs(fp, found);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      const content = await fs.readFile(fp, 'utf8');
      let match;
      PROCESS_ENV_RE.lastIndex = 0;
      while ((match = PROCESS_ENV_RE.exec(content)) !== null) {
        found.add(match[1]);
      }
    }
  }
}
