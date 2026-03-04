// =============================================================================
//  NODEWAVE — @nodewave/core — Deep Upgrade Transforms
//  Rewrites actual code for Next.js migration patterns
// =============================================================================

import { fsx as fs } from '../fsx.js';
import path from 'node:path';

export interface TransformResult {
  file: string;
  changes: string[];
}

export interface UpgradeTransformResult {
  transformed: TransformResult[];
  skipped: string[];
  warnings: string[];
}

// ─── getServerSideProps → async RSC ──────────────────────────────────────────

export async function transformGetServerSideProps(cwd: string): Promise<UpgradeTransformResult> {
  const result: UpgradeTransformResult = { transformed: [], skipped: [], warnings: [] };
  const files = await findPageFiles(cwd);

  for (const file of files) {
    const original = await fs.readFile(file, 'utf8');
    if (!original.includes('getServerSideProps')) {
      result.skipped.push(path.relative(cwd, file));
      continue;
    }

    const changes: string[] = [];
    let code = original;

    // Extract getServerSideProps return data shape
    const gsspMatch = code.match(
      /export\s+(?:const\s+getServerSideProps\s*(?::\s*GetServerSideProps[^=]*)?\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[\s\S]*?return\s*\{\s*props:\s*(\{[\s\S]*?\})\s*\}[\s\S]*?\}|async\s+function\s+getServerSideProps[^{]*\{[\s\S]*?return\s*\{\s*props:\s*(\{[\s\S]*?\})\s*\}[\s\S]*?\})/
    );

    // Add 'use client' if component uses hooks (rough heuristic)
    const usesHooks = /\buse(State|Effect|Ref|Callback|Memo|Context)\b/.test(code);
    if (!usesHooks && !code.includes("'use client'") && !code.includes('"use client"')) {
      // Convert to RSC: remove getServerSideProps, inline the fetch
      code = code
        // Remove the export of getServerSideProps
        .replace(/\nexport\s+(?:const\s+getServerSideProps\s*=\s*async[^;]*;|async\s+function\s+getServerSideProps[\s\S]*?\n\})\n?/g, '')
        // Make default export async
        .replace(/^export default function\s+(\w+)/, 'export default async function $1')
        .replace(/^export default function\s+(\w+)\(props[^)]*\)/, 'export default async function $1()')
        // Replace props parameter references with note
        ;

      if (code !== original) {
        changes.push('Removed getServerSideProps — make component async and fetch data directly');
        if (gsspMatch) {
          changes.push('⚠ Move data fetching logic into the component body with: const data = await fetch(...)');
        }
      }
    } else {
      // Has hooks — needs 'use client' + separate server component wrapper
      if (!code.includes("'use client'")) {
        code = `'use client';\n${code}`;
        changes.push("Added 'use client' directive (component uses hooks)");
      }
      result.warnings.push(`${path.relative(cwd, file)}: uses hooks with getServerSideProps — manual split into Server/Client components recommended`);
    }

    if (changes.length > 0) {
      await fs.writeFile(file, code, 'utf8');
      result.transformed.push({ file: path.relative(cwd, file), changes });
    }
  }

  return result;
}

// ─── getStaticProps → fetch with cache:'force-cache' ─────────────────────────

export async function transformGetStaticProps(cwd: string): Promise<UpgradeTransformResult> {
  const result: UpgradeTransformResult = { transformed: [], skipped: [], warnings: [] };
  const files = await findPageFiles(cwd);

  for (const file of files) {
    const original = await fs.readFile(file, 'utf8');
    if (!original.includes('getStaticProps')) {
      result.skipped.push(path.relative(cwd, file));
      continue;
    }

    const changes: string[] = [];
    let code = original;

    const usesHooks = /\buse(State|Effect|Ref|Callback|Memo|Context)\b/.test(code);

    if (!usesHooks) {
      code = code
        .replace(/\nexport\s+(?:const\s+getStaticProps\s*=\s*async[^;]*;|async\s+function\s+getStaticProps[\s\S]*?\n\})\n?/g, '')
        .replace(/^export default function\s+(\w+)/, 'export default async function $1');

      if (code !== original) {
        changes.push('Removed getStaticProps — use fetch(url, { cache: \'force-cache\' }) in async component');
      }
    } else {
      if (!code.includes("'use client'")) {
        code = `'use client';\n${code}`;
        changes.push("Added 'use client' directive");
      }
      result.warnings.push(`${path.relative(cwd, file)}: uses hooks — split into Server Component (fetch) + Client Component (interactivity)`);
    }

    if (changes.length > 0) {
      await fs.writeFile(file, code, 'utf8');
      result.transformed.push({ file: path.relative(cwd, file), changes });
    }
  }

  return result;
}

// ─── next/router → next/navigation ───────────────────────────────────────────

export async function transformNextRouter(cwd: string): Promise<UpgradeTransformResult> {
  const result: UpgradeTransformResult = { transformed: [], skipped: [], warnings: [] };
  const files = await findAllSourceFiles(cwd);

  for (const file of files) {
    const original = await fs.readFile(file, 'utf8');
    if (!original.includes('next/router')) {
      result.skipped.push(path.relative(cwd, file));
      continue;
    }

    const changes: string[] = [];
    let code = original;

    // Import replacement
    if (code.includes("from 'next/router'") || code.includes('from "next/router"')) {
      // useRouter → next/navigation (note: API differs — router.push → router.push, router.query → useSearchParams)
      code = code
        .replace(/from ['"]next\/router['"]/g, "from 'next/navigation'")
        .replace(/import\s+Router\s+from\s+['"]next\/router['"]/g, "import { useRouter } from 'next/navigation'");

      changes.push("Replaced 'next/router' import with 'next/navigation'");

      // router.query → useSearchParams (flag for manual fix — it's a hook)
      if (code.includes('router.query') || code.includes('router?.query')) {
        result.warnings.push(`${path.relative(cwd, file)}: router.query → use useSearchParams() from next/navigation (requires 'use client')`);
        changes.push('⚠ router.query usage detected — replace with useSearchParams()');
      }

      // router.pathname → usePathname
      if (code.includes('router.pathname')) {
        result.warnings.push(`${path.relative(cwd, file)}: router.pathname → use usePathname() from next/navigation`);
        changes.push('⚠ router.pathname detected — replace with usePathname()');
      }
    }

    if (changes.length > 0) {
      await fs.writeFile(file, code, 'utf8');
      result.transformed.push({ file: path.relative(cwd, file), changes });
    }
  }

  return result;
}

// ─── next/link: remove <a> child ─────────────────────────────────────────────

export async function transformNextLink(cwd: string): Promise<UpgradeTransformResult> {
  const result: UpgradeTransformResult = { transformed: [], skipped: [], warnings: [] };
  const files = await findAllSourceFiles(cwd);

  for (const file of files) {
    const original = await fs.readFile(file, 'utf8');
    if (!original.includes('next/link') || !original.includes('<a')) {
      result.skipped.push(path.relative(cwd, file));
      continue;
    }

    const changes: string[] = [];
    let code = original;

    // <Link href="..."><a>text</a></Link> → <Link href="...">text</Link>
    // This is a simplified regex — handles common cases
    const linkAnchorRe = /(<Link\s[^>]*>)\s*<a(?:\s[^>]*)?>([\s\S]*?)<\/a>\s*(<\/Link>)/g;
    const replaced = code.replace(linkAnchorRe, (_, open, inner, close) => {
      changes.push('Removed <a> child from <Link> (Next.js 13+ renders <a> automatically)');
      return `${open}${inner}${close}`;
    });

    if (replaced !== code) {
      code = replaced;
      await fs.writeFile(file, code, 'utf8');
      result.transformed.push({ file: path.relative(cwd, file), changes });
    }
  }

  return result;
}

// ─── Add missing cache options to fetch() ────────────────────────────────────

export async function transformFetchCache(cwd: string, defaultStrategy: 'force-cache' | 'no-store' = 'no-store'): Promise<UpgradeTransformResult> {
  const result: UpgradeTransformResult = { transformed: [], skipped: [], warnings: [] };
  const files = await findAllSourceFiles(cwd);

  for (const file of files) {
    const original = await fs.readFile(file, 'utf8');
    if (!original.includes('fetch(')) {
      result.skipped.push(path.relative(cwd, file));
      continue;
    }

    const changes: string[] = [];
    let code = original;

    // fetch('url') → fetch('url', { cache: 'no-store' })
    // Only for bare fetch calls with no options object
    const bareFetchRe = /\bfetch\((['"`][^'"`]+['"`])\)(?!\s*\.catch|\s*\.then|\s*,)/g;
    const replaced = code.replace(bareFetchRe, (_, urlArg) => {
      changes.push(`Added { cache: '${defaultStrategy}' } to fetch(${urlArg})`);
      return `fetch(${urlArg}, { cache: '${defaultStrategy}' })`;
    });

    if (replaced !== code) {
      code = replaced;
      await fs.writeFile(file, code, 'utf8');
      result.transformed.push({ file: path.relative(cwd, file), changes });
    }
  }

  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function findPageFiles(cwd: string): Promise<string[]> {
  const dirs = ['src/pages', 'pages', 'src/app', 'app'].map(d => path.join(cwd, d));
  const results: string[] = [];
  for (const dir of dirs) {
    if (!await fs.pathExists(dir)) continue;
    await walkFiles(dir, ['.tsx', '.ts', '.jsx', '.js'], results, name => !name.startsWith('_') && !name.startsWith('layout'));
  }
  return results;
}

async function findAllSourceFiles(cwd: string): Promise<string[]> {
  const dirs = ['src', 'app', 'pages', 'components', 'lib'].map(d => path.join(cwd, d));
  const results: string[] = [];
  for (const dir of dirs) {
    if (!await fs.pathExists(dir)) continue;
    await walkFiles(dir, ['.tsx', '.ts', '.jsx', '.js'], results);
  }
  return results;
}

async function walkFiles(dir: string, exts: string[], results: string[], filter?: (name: string) => boolean) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.next') {
      await walkFiles(full, exts, results, filter);
    } else if (exts.some(ext => e.name.endsWith(ext))) {
      if (!filter || filter(e.name)) results.push(full);
    }
  }
}
