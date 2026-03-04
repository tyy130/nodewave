// =============================================================================
//  NODEWAVE — @nodewave/core — Template Renderer
// =============================================================================

import { fsx as fs } from './fsx.js';
import path from 'node:path';

/** Simple {{varName}} template interpolation — no CJS deps */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export async function renderTemplate(
  templateDir: string,
  destDir: string,
  vars: Record<string, string>
): Promise<void> {
  if (!await fs.pathExists(templateDir)) return;

  const entries = await fs.readdir(templateDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(templateDir, entry.name);
    const destName = entry.name.endsWith('.hbs') ? entry.name.slice(0, -4) : entry.name;
    const destPath = path.join(destDir, destName);

    if (entry.isDirectory()) {
      await fs.ensureDir(destPath);
      await renderTemplate(srcPath, destPath, vars);
    } else if (entry.name.endsWith('.hbs')) {
      const content = await fs.readFile(srcPath, 'utf8');
      const rendered = interpolate(content, vars);
      await fs.ensureDir(path.dirname(destPath));
      await fs.writeFile(destPath, rendered, 'utf8');
    } else {
      await fs.copy(srcPath, destPath);
    }
  }
}
