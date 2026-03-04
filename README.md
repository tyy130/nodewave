# 🌊 nodewave

> Seamless build, deploy, and upgrade for **Next.js** and **Node.js** projects.  
> VS Code extension + CLI. Works in **VS Code**, **Cursor**, **GitHub Codespaces**, and any VS Code-compatible IDE.

---

## What is nodewave?

nodewave makes Next.js and Node.js projects first-class citizens in your editor — with a sidebar explorer, one-click deploy, smart config generation, upgrade wizards, and a project health scanner.

| Feature | What it does |
|---|---|
| VS Code extension | Sidebar, status bar, command palette, WebView panels |
| New Project wizard | Scaffold Next.js / Express / Fastify projects |
| Project Settings | Edit `nodewave.config.js` via GUI property pages |
| Upgrade wizard | Migrate to App Router, ESM, latest Next.js — with actual code rewrites |
| `nodewave harvest` | Scan routes (edge/ISR/static/serverless), generate `vercel.json` with per-function config |
| `nodewave doctor` | Find misconfigurations before they break production |
| `nodewave env` | List, sync, and pull environment variables across platforms |
| Status bar deploy | Deploy to Vercel / Netlify / Railway in one click |

---

## Installation

### VS Code Extension

```bash
code --install-extension nodewave-0.1.0.vsix
```

Or install from the VS Code Marketplace:
```
ext install nodewave.nodewave
```

### CLI

```bash
# Run without installing
npx nodewave

# Install globally
npm i -g nodewave-cli
```

---

## VS Code Extension

### Sidebar

Click the 🌊 icon in the Activity Bar:

- **Project** — name, framework, detected type
- **Routes** — discovered routes with edge/ISR/static/serverless labels
- **Environment Variables** — defined, missing, and unused vars
- **Deployments** — current target and status

### Command Palette

`Ctrl+Shift+P` → type `nodewave`:

| Command | Description |
|---|---|
| `nodewave: New Project` | Open the New Project wizard |
| `nodewave: Build` | Smart build |
| `nodewave: Start Dev Server` | Start dev server in terminal |
| `nodewave: Deploy` | Deploy to current target |
| `nodewave: Harvest Config` | Scan and generate deployment config |
| `nodewave: Upgrade Project` | Open the Upgrade wizard |
| `nodewave: Add Package` | Install and auto-configure a package |
| `nodewave: Open Settings` | Open Project Settings |
| `nodewave: Show Status` | Show project health |

### Status Bar

```
🌊 ▲ vercel    🚀 Deploy
```

Click the target name to switch. Click 🚀 to deploy.

---

## CLI Commands

```bash
nodewave init [name]          Scaffold a new project
nodewave build                Smart build (auto-detects type)
nodewave dev                  Start dev server
nodewave deploy [--target]    Deploy to Vercel / Netlify / Railway
nodewave upgrade              Upgrade project (8 guided options)
nodewave harvest              Scan routes + generate deployment config
nodewave env [list|sync|pull] Manage environment variables
nodewave doctor               Scan for misconfigurations
nodewave add <package>        Install + auto-configure a package
nodewave config               Interactive config editor
nodewave status               Project health and deployment status
```

### `nodewave harvest`

Scans every route file and determines its rendering strategy. Generates a correct `vercel.json` with per-function config:

```
  [static]     /              app/page.tsx
  [isr]        /blog/:slug    revalidate:60s   app/blog/[slug]/page.tsx
  [edge]       /api/auth      app/api/auth/route.ts
  [serverless] /api/users     ⚠ uncached fetch  app/api/users/route.ts
```

Output `vercel.json`:
```json
{
  "version": 2,
  "framework": "nextjs",
  "functions": {
    "app/api/auth/route.ts": { "runtime": "edge", "maxDuration": 10 }
  }
}
```

### `nodewave doctor`

```
  ✓ vercel.json version is 2
  ✓ 1 route configured for Edge Runtime
  ✓ 1 route using ISR

  ✗ Missing environment variables
     DB_API_KEY used in lib/db.ts but not in .env
     → Add to .env.local: DB_API_KEY=

  ⚠ fetch() without cache option  [app/api/users/route.ts]
     → fetch(url, { cache: 'no-store' })

  Health score: 75/100  ███████████████░░░░░
```

### `nodewave env`

```bash
nodewave env list                     # show defined, missing, leaked vars
nodewave env sync --target vercel     # push vars to Vercel
nodewave env pull --target vercel     # pull .env.local from Vercel
```

### `nodewave upgrade`

8 guided upgrade options:
- Pages Router → App Router
- `getServerSideProps` → async Server Component
- `getStaticProps` → `fetch(url, { cache: 'force-cache' })`
- `next/router` → `next/navigation`
- Fix `<Link><a>` children (Next.js 13+)
- Add `cache:` to bare `fetch()` calls
- CommonJS → ES Modules
- Bump Next.js to latest

---

## Configuration

`nodewave.config.js` in your project root:

```js
export default {
  project: 'my-app',
  type: 'nextjs-app',         // nextjs-app | nextjs-pages | express | fastify
  target: 'vercel',           // vercel | netlify | railway
  build: {
    command: 'next build',
    output: '.next',
  },
  env: {
    required: ['DATABASE_URL', 'NEXTAUTH_SECRET'],
    optional: ['ANALYTICS_ID'],
  },
  deploy: {
    region: 'iad1',
    nodeVersion: '22',
  },
};
```

---

## Project Templates

| Template | Description |
|---|---|
| `nextjs-app` | Next.js 15 App Router |
| `nextjs-pages` | Next.js 15 Pages Router |
| `express` | Express 5 REST API |
| `fastify` | Fastify API |

---

## Deployment Targets

| Target | Config File | CLI |
|---|---|---|
| **Vercel** | `vercel.json` | `npm i -g vercel` |
| **Netlify** | `netlify.toml` | `npm i -g netlify-cli` |
| **Railway** | `railway.json` | `npm i -g @railway/cli` |

---

## Architecture

pnpm monorepo:

```
packages/
├── core/       @nodewave/core — detectors, adapters, harvester, doctor, env analyzer, upgrade transforms
├── cli/        nodewave-cli — CLI wrapping @nodewave/core
└── extension/  VS Code extension — sidebar, status bar, WebView panels, command palette
```

---

## Compatibility

- Node.js 18+
- VS Code 1.80+, Cursor, GitHub Codespaces, Windsurf

---

*2026-03-04*
