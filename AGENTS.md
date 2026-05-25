# AGENTS.md

## Cursor Cloud specific instructions

### Overview

nodewave is a pnpm monorepo with three packages:

| Package | Path | Build tool | Description |
|---------|------|-----------|-------------|
| `@nodewave/core` | `packages/core` | tsup | Shared engine (detectors, adapters, harvester, doctor, env analyzer, upgrade transforms) |
| `nodewave-cli` | `packages/cli` | tsup | CLI wrapping `@nodewave/core` |
| `nodewave` (VS Code ext) | `packages/extension` | webpack | VS Code/Cursor extension with React WebView panels |

### Commands

Standard commands are in root `package.json`:

- `pnpm install` — install all dependencies
- `pnpm build` — build all packages (core first, then cli + extension in parallel)
- `pnpm dev` — watch mode for all packages (see caveat below)
- `pnpm clean` — remove all `dist/` directories

### Gotchas

- **No lint scripts exist.** `pnpm lint` will fail with `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`. Use `tsc --noEmit` in `packages/core` for type-checking.
- **No test framework is configured.** There are no test scripts or test runners.
- **`pnpm dev` race condition:** Running `pnpm dev` at the root may fail because the CLI package inlines `@nodewave/core` via `noExternal`, and both start building simultaneously. To work around this, either build core first (`cd packages/core && pnpm dev`), or run `pnpm build` before `pnpm dev`.
- **CLI TypeScript errors with `tsc --noEmit`:** The CLI package uses `import.meta` which shows TS errors under the `NodeNext` tsconfig, but tsup builds it correctly as ESM. These errors are expected and do not affect the build.
- **Running the CLI locally:** After building, run `node packages/cli/dist/cli.mjs <command>`. Use `--cwd <path>` to point it at a target project directory.
- **Extension testing requires VS Code/Cursor.** The extension cannot be tested in a headless cloud environment. Build verification (`pnpm build`) is sufficient for CI.
- **No external services required.** No databases, Docker, or API keys are needed. nodewave is a pure filesystem-based developer tool.
