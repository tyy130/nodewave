# 🌊 nodewave

> **HeatWave for Node.js** — Seamless build, deploy, and upgrade for Next.js and Node.js projects.  
> Works in **VS Code**, **Cursor**, **GitHub Codespaces**, and any VS Code-compatible IDE.

---

## What is nodewave?

[HeatWave](https://www.firegiant.com/heatwave/) makes WiX installer projects first-class citizens in Visual Studio — with a full GUI, property pages, one-click deploy, and upgrade wizards. **nodewave** mirrors that exact philosophy for Node.js and Next.js projects.

| HeatWave | nodewave |
|---|---|
| Visual Studio extension | VS Code extension (+ CLI) |
| New Project wizard | New Project wizard WebView |
| Property pages | Project Settings WebView |
| WiX v3 upgrade wizard | Upgrade Project WebView (Pages→App Router, CJS→ESM) |
| One-click build/deploy | Status bar 🚀 Deploy button |
| Harvesting | `nodewave harvest` (routes, env vars, deploy config) |
| NuGet package management | `nodewave add` with post-install auto-config |

---

## Installation

### VS Code Extension

Install from the VS Code Marketplace (or VSIX):

```
ext install nodewave.nodewave
```

Or install the VSIX manually:

```bash
code --install-extension nodewave-0.1.0.vsix
```

### CLI

```bash
# Run without installing
npx nodewave init my-app

# Or install globally
npm i -g nodewave
```

---

## VS Code Extension Features

### Sidebar (NodewaveExplorer)

Click the 🌊 icon in the Activity Bar to open the nodewave sidebar:

- **Project** — name, framework, detected type
- **Routes** — all discovered Next.js/Express routes (live tree)
- **Environment Variables** — `.env` keys grouped as defined, missing, or unused
- **Deployments** — current target with status

### Command Palette

Press `Ctrl+Shift+P` (or `Cmd+Shift+P`) and type `nodewave`:

| Command | Description |
|---|---|
| `nodewave: New Project` | Open the New Project wizard |
| `nodewave: Build` | Run smart build in terminal |
| `nodewave: Start Dev Server` | Start dev server in terminal |
| `nodewave: Deploy` | Deploy to current target |
| `nodewave: Harvest Config` | Scan project and generate deployment config |
| `nodewave: Upgrade Project` | Open the Upgrade wizard |
| `nodewave: Add Package` | Install and auto-configure a package |
| `nodewave: Open Settings` | Open the Project Settings property pages |
| `nodewave: Show Status` | Show project health in terminal |

### Status Bar

The status bar shows your current deployment target:

```
🌊 ▲ vercel    🚀 Deploy
```

Click the target name to switch targets. Click 🚀 to deploy immediately.

### New Project Wizard

A full-form wizard (like HeatWave's New Project dialog):

- Project name
- Project type (Next.js App Router, Pages Router, Express, Fastify)
- Deployment target (Vercel, Netlify, Railway)
- Package manager

### Project Settings (Property Pages)

Edit all `nodewave.config.js` fields via a GUI form — no manual file editing needed.

### Upgrade Wizard

Select and apply upgrade paths:
- **Pages Router → App Router** — moves `pages/` → `app/`, converts `getServerSideProps`
- **CommonJS → ES Modules** — `require` → `import`, `module.exports` → `export default`
- **Bump Next.js to latest** — updates version in `package.json`

---

## CLI Commands

```bash
nodewave init [name]          Scaffold a new project
nodewave build                Smart build (auto-detects type)
nodewave dev                  Start dev server
nodewave deploy [--target]    Deploy to Vercel / Netlify / Railway
nodewave upgrade              Upgrade project (guided)
nodewave harvest              Scan project → generate deployment config
nodewave add <package>        Install + auto-configure a package
nodewave config               Interactive config editor
nodewave status               Project health and deployment status
```

### Examples

```bash
# Create a new Next.js App Router project targeting Vercel
nodewave init my-app --type nextjs-app --target vercel

# Deploy the current project
nodewave deploy

# Deploy to a specific target
nodewave deploy --target railway

# Add Tailwind CSS (with init hint)
nodewave add tailwindcss

# Upgrade Pages Router to App Router
nodewave upgrade

# Check project health
nodewave status
```

---

## Configuration

nodewave generates a `nodewave.config.js` in your project root:

```js
// nodewave.config.js
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
| `nextjs-app` | Next.js 15 App Router (full-stack) |
| `nextjs-pages` | Next.js 15 Pages Router |
| `express` | Express 5 REST API |
| `fastify` | Fastify API |
| `fullstack` | Next.js + Express backend monorepo |

---

## Deployment Targets

| Target | Config File | CLI Required |
|---|---|---|
| **Vercel** | `vercel.json` | `npm i -g vercel` |
| **Netlify** | `netlify.toml` | `npm i -g netlify-cli` |
| **Railway** | `railway.json` | `npm i -g @railway/cli` |

---

## Architecture

This is a **pnpm monorepo** with three packages:

```
packages/
├── core/       @nodewave/core — detectors, adapters, harvester, upgraders, templates, config schema
├── cli/        nodewave (npm package) — Commander.js CLI wrapping @nodewave/core
└── extension/  VS Code extension — WebView panels, sidebar, status bar, commands
```

---

## Compatibility

- VS Code 1.80+
- Cursor
- GitHub Codespaces
- Any VS Code-compatible IDE (Windsurf, etc.)

---

*2026-03-01*
