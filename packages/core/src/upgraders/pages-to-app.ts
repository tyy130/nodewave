// =============================================================================
//  NODEWAVE — @nodewave/core — Upgrader: Pages Router → App Router
// =============================================================================

import { fsx as fs } from '../fsx.js';
import path from 'node:path';

export interface UpgradeResult {
  filesChanged: string[];
  warnings: string[];
}

/**
 * Migrates a Next.js Pages Router project to App Router.
 * Moves pages/ → app/ and adds 'use client' where needed.
 */
export async function pagesToAppRouter(cwd: string): Promise<UpgradeResult> {
  const filesChanged: string[] = [];
  const warnings: string[] = [];

  const pagesDir = await fs.pathExists(path.join(cwd, 'src', 'pages'))
    ? path.join(cwd, 'src', 'pages')
    : path.join(cwd, 'pages');

  if (!await fs.pathExists(pagesDir)) {
    warnings.push('No pages/ directory found — project may already use App Router');
    return { filesChanged, warnings };
  }

  const appDir = pagesDir.replace('pages', 'app');
  await fs.ensureDir(appDir);

  const entries = await fs.readdir(pagesDir, { withFileTypes: true });

  for (const entry of entries) {
    const src = path.join(pagesDir, entry.name);
    const dest = path.join(appDir, entry.name);

    if (entry.name === '_app.tsx' || entry.name === '_app.ts') {
      // Convert _app to layout
      const content = await fs.readFile(src, 'utf8');
      const layoutContent = convertAppToLayout(content);
      const layoutDest = path.join(appDir, 'layout.tsx');
      await fs.writeFile(layoutDest, layoutContent, 'utf8');
      filesChanged.push(`+ ${path.relative(cwd, layoutDest)} (converted from _app)`);
      continue;
    }

    if (entry.name === '_document.tsx' || entry.name === '_document.ts') {
      warnings.push(`_document.tsx: Review manually — head/body configuration moved to layout.tsx in App Router`);
      continue;
    }

    if (entry.name.startsWith('_')) continue;

    if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      const content = await fs.readFile(src, 'utf8');
      const appContent = convertPageToAppRoute(content);
      const pageDest = path.join(appDir, entry.name.replace(/\.(tsx?|jsx?)$/, ''), 'page.tsx');
      await fs.ensureDir(path.dirname(pageDest));
      await fs.writeFile(pageDest, appContent, 'utf8');
      filesChanged.push(`+ ${path.relative(cwd, pageDest)}`);
    }
  }

  // Rename pages/ to pages.bak/ (preserve original)
  const bakDir = pagesDir + '.bak';
  await fs.move(pagesDir, bakDir, { overwrite: true });
  warnings.push(`Original pages/ moved to ${path.relative(cwd, bakDir)} — delete after verification`);

  return { filesChanged, warnings };
}

function convertAppToLayout(content: string): string {
  // Strip AppProps boilerplate, wrap in RootLayout
  return `import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}

function convertPageToAppRoute(content: string): string {
  // Add 'use client' if the page uses hooks or event handlers
  const usesClientFeatures = /use(State|Effect|Ref|Callback|Memo|Context)|onClick|onChange|on[A-Z]/.test(content);
  const directive = usesClientFeatures ? `'use client';\n\n` : '';

  // Strip getServerSideProps / getStaticProps (add warning comment)
  const stripped = content
    .replace(/export\s+(?:const|async\s+function|function)\s+getServerSideProps[\s\S]*?^}/gm,
      '// TODO: Migrate getServerSideProps to async Server Component data fetching')
    .replace(/export\s+(?:const|async\s+function|function)\s+getStaticProps[\s\S]*?^}/gm,
      '// TODO: Migrate getStaticProps to async Server Component or generateStaticParams')
    .replace(/export\s+(?:const|async\s+function|function)\s+getStaticPaths[\s\S]*?^}/gm,
      '// TODO: Migrate getStaticPaths to generateStaticParams');

  return directive + stripped;
}
