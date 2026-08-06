# ReinAI Code

A desktop AI pair-programmer: open a project folder, chat with an AI, and it
actually reads/writes files and runs shell commands in that folder — the same
kind of tool-calling loop Claude Code or Codex CLI use, in a desktop GUI
(chat + file tree) instead of a terminal.

Runs as an Electron app (Node.js main process + a React/Vite renderer), so it
can genuinely touch the local filesystem and spawn real processes — not
something a browser sandbox can do, which is why this isn't part of the main
ReinAI web app.

## What's implemented (v1)

- Open any local folder as a project; a file tree shows its contents
  (`.git`/`node_modules`/build output dirs hidden).
- Chat with the AI, which has four tools it can actually call:
  `list_directory`, `read_file`, `write_file`, `run_command` (runs in the
  project folder as cwd). Tool calls and their results show inline in the
  chat as they happen.
- Multi-step agentic loop (up to 20 tool-call steps per turn) via the Vercel
  AI SDK's `streamText` + `tools` + `stopWhen: stepCountIs(20)`.
- Same multi-provider support as the web app: Anthropic / OpenAI / Google /
  NVIDIA NIM / OpenRouter. Your API key is entered once in Settings and
  encrypted at rest via Electron's `safeStorage` (OS keychain — Windows
  DPAPI, macOS Keychain, libsecret on Linux), never written in plaintext.
- File operations are sandboxed to the opened project folder — a resolved
  path outside it is rejected before any read/write happens.
- Commands run with a 120s timeout and capped output (20k chars) so a
  runaway process/log can't hang or flood the UI.

## Not yet built (roadmap, not stubbed)

- No inline diff view for file edits (writes happen directly; there's no
  "review before applying" step yet).
- No syntax highlighting / code editor in the file tree — it's read-only,
  navigation-only for now.
- No conversation persistence across app restarts (in-memory per session).
- No cancel-mid-tool-call granularity — stopping aborts the whole turn.
- No custom app icon yet (uses electron-builder's default).

## Development

```bash
pnpm install       # first time only
pnpm run dev:renderer   # terminal 1: Vite dev server
pnpm run dev:main       # terminal 2: watches + recompiles the main process
pnpm start              # terminal 3: launches Electron (run after both above are up)
```

## Building a Windows installer

```bash
pnpm run build      # compiles renderer + main
pnpm run dist:win    # packages via electron-builder — outputs to release/
```

Produces both an NSIS installer (`ReinAI Code Setup <version>.exe`) and a
portable single-file `.exe` under `release/`. Cross-building the Windows
target from Linux/macOS needs Wine installed; building directly on Windows
needs nothing extra.

## Architecture notes

- `src/main` — Electron main process. Compiled as ESM (`tsconfig.main.json`)
  because the `ai` SDK and provider packages (`@ai-sdk/*`) ship ESM-only.
- `src/main/preload.ts` — compiled **separately** as CommonJS
  (`tsconfig.preload.json`). Electron's preload script loader uses its own
  sandboxed loading mechanism that doesn't support plain `.js` ESM even when
  the app's `package.json` says `"type": "module"` — only CJS or an explicit
  `.mjs` extension work there. Kept fully self-contained (no imports from
  `src/shared`) to avoid that file being pulled into two different module
  targets by two different tsc configs.
- `src/renderer` — a plain Vite + React app, isolated from the main process
  via `contextBridge` (see `preload.ts`) — no direct Node access from the UI.
- `src/shared/types.ts` — types (and the provider/model registry) shared
  between main and renderer.
- This folder is intentionally **not** a workspace member of the parent
  ReinAI repo — it has its own `pnpm-workspace.yaml` so `pnpm install`/`pnpm
  build` run here don't get silently swallowed by the parent repo's
  workspace root detection, and its dependency tree stays fully independent
  of the Next.js web app's.
