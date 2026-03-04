// =============================================================================
//  NODEWAVE — @nodewave/core — Upgrader: CJS → ESM
// =============================================================================

import { fsx as fs } from '../fsx.js';
import path from 'node:path';

export interface CjsToEsmResult {
  filesChanged: string[];
  warnings: string[];
}

export async function cjsToEsm(cwd: string): Promise<CjsToEsmResult> {
  const filesChanged: string[] = [];
  const warnings: string[] = [];

  // Set "type": "module" in package.json
  const pkgPath = path.join(cwd, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath) as Record<string, unknown>;
    if (pkg['type'] !== 'module') {
      pkg['type'] = 'module';
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
      filesChanged.push('package.json (added "type": "module")');
    }
  }

  // Transform .js/.ts source files
  const srcDirs = ['src', 'lib', 'utils'].map(d => path.join(cwd, d));
  for (const dir of srcDirs) {
    if (await fs.pathExists(dir)) {
      await transformDir(dir, cwd, filesChanged, warnings);
    }
  }

  return { filesChanged, warnings };
}

async function transformDir(dir: string, cwd: string, changed: string[], warnings: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      await transformDir(fp, cwd, changed, warnings);
    } else if (entry.isFile() && /\.(ts|js|mjs)$/.test(entry.name)) {
      const original = await fs.readFile(fp, 'utf8');
      const transformed = transformCjsToEsm(original);
      if (transformed !== original) {
        await fs.writeFile(fp, transformed, 'utf8');
        changed.push(path.relative(cwd, fp));
      }
    }
  }
}

function transformCjsToEsm(src: string): string {
  return src
    // require('x') → import x from 'x'
    .replace(/const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\);?/g, `import $1 from '$2';`)
    // const { a, b } = require('x') → import { a, b } from 'x'
    .replace(/const\s+\{([^}]+)\}\s*=\s*require\(['"]([^'"]+)['"]\);?/g, `import {$1} from '$2';`)
    // module.exports = x → export default x
    .replace(/module\.exports\s*=\s*/g, 'export default ')
    // module.exports.foo = x → export const foo = x
    .replace(/module\.exports\.(\w+)\s*=\s*/g, 'export const $1 = ');
}
