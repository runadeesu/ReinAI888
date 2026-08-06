# ReinAI

ReinAI is an AI開発プラットフォーム (AI development platform) — a self-hosted,
ChatGPT/Claude-style web app purpose-built for software development: multi-provider
AI chat, project/folder-organized conversations, reusable prompt templates, file
upload & analysis, and encrypted per-user API key management. Every feature in this
codebase talks to a real database, a real auth system, and real AI provider APIs —
there is no mock or placeholder data.

## Stack

- **Next.js 15** (App Router, TypeScript) — `src/app`
- **Prisma + Postgres** — `prisma/schema.prisma`. Postgres (not SQLite) so this
  deploys cleanly to serverless hosts like Netlify, whose functions don't have
  a persistent local filesystem.
- **Auth.js v5** — credentials (bcrypt) + Google OAuth, email verification,
  password reset, TOTP 2FA, server-side session tracking/revocation — `src/auth.ts`
- **Vercel AI SDK** (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`,
  plus NVIDIA NIM via `@ai-sdk/openai`'s OpenAI-compatible mode) for streaming
  chat across providers — `src/lib/ai`
- **AES-256-GCM** encryption for user-supplied provider API keys and TOTP secrets
  — `src/lib/crypto/encryption.ts`
- Tailwind CSS v4, `react-markdown` + `rehype-highlight` for code-aware chat
  rendering, `pdf-parse`/`mammoth` for attachment text extraction
- File storage: local disk by default, automatically switches to **Netlify
  Blobs** when `NETLIFY=true` (set by Netlify itself) — `src/lib/files/storage.ts`

The `src/lib` directory is the shared "core" (AI provider abstraction, auth,
encryption, DB access, file parsing) — designed to be extracted into a shared
package if/when a companion **ReinAI Code** (developer-focused IDE-integrated
app) or desktop/mobile shells are added, per the project roadmap below.

## Features implemented

- **Accounts**: registration, email verification, login, Google OAuth, password
  reset, password/email change, profile editing with avatar upload, unique
  account IDs, login history, active-session list with per-session revocation,
  optional TOTP 2FA with QR enrollment
- **AI chat**: multi-provider streaming chat (Anthropic Claude / OpenAI / Google
  Gemini / NVIDIA NIM), per-conversation model switching, server-default or user-supplied
  (encrypted) API keys, auto-titled conversations
- **Organization**: pinned/favorite/searchable conversation list, projects,
  nested folders, tags
- **Prompt templates**: CRUD, categories, favorites, JSON import/export
- **Files**: drag-and-drop upload, text/code/PDF/DOCX content extraction fed
  into the AI's context window, safe inline-vs-download serving
- **Code-aware chat UI**: syntax-highlighted code blocks separated from prose,
  copy-to-clipboard, per-snippet download, dark/light theme
- **Security**: bcrypt password hashing, AES-256-GCM key encryption, Zod
  validation on every mutation endpoint, per-route + global rate limiting,
  CSP/X-Frame-Options/etc. security headers, path-traversal-safe file storage,
  safe attachment content-disposition (SVG/HTML never rendered inline)

## Getting started

You need a Postgres database. Easiest local options: `docker run -e
POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`, a system Postgres
install, or a free hosted instance (e.g. [Neon](https://neon.tech)) — any of
these work, since it's just a `DATABASE_URL`.

```bash
pnpm install
cp .env.example .env
# fill in DATABASE_URL, AUTH_SECRET and ENCRYPTION_KEY at minimum (see below), then:
npx prisma migrate deploy
pnpm dev
```

Open http://localhost:3000 — you'll land on `/login`. Register an account; if
`SMTP_*` isn't configured yet, the verification/reset emails are printed to the
server console instead of sent, so local development works with zero email setup.

### Required environment variables

Generate secrets with:

```bash
openssl rand -base64 32                                                   # AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # ENCRYPTION_KEY
```

See `.env.example` for the full list (Google OAuth, SMTP, default provider API
keys, upload directory). Individual users can also register their own provider
API keys from **Settings → API Keys**, encrypted at rest and preferred over the
server-wide default.

### Production

```bash
pnpm build
pnpm start
```

`trustHost: true` is set in `src/auth.ts` for self-hosted (non-Vercel) deploys —
put a reverse proxy in front that enforces the real external Host header, and
set `NEXTAUTH_URL` to your public URL.

## Deploying to Netlify

The repo is already configured for Netlify: `netlify.toml` wires up
`@netlify/plugin-nextjs` (Netlify's official Next.js runtime — handles SSR,
API routes, streaming responses, and middleware as Netlify
Functions/Edge Functions automatically), and file uploads switch to Netlify
Blobs at runtime (see `src/lib/files/storage.ts`). This part needs to be done
from your own Netlify account — no CLI token for it lives in this repo/session:

1. **Get a Postgres database via the Supabase extension.** (Netlify's own
   built-in "Netlify DB", powered by Neon, is discontinued — its extension
   page now shows a deprecation notice and no longer provisions new
   databases; don't use it.) In the Netlify dashboard: **Extensions →
   Supabase → Connect**, sign in/create a free Supabase account, pick a
   project. Then take the connection string from **that Supabase project's
   dashboard → Connect → "Transaction pooler" tab**, not the "direct
   connection" one — direct connections are IPv6-only on Supabase's free
   tier and unreachable from Netlify Functions (AWS Lambda has no outbound
   IPv6 route), which fails with `Can't reach database server` at deploy
   time. The pooler string looks like:
   `postgresql://postgres.<ref>:<password>@aws-<n>-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`
   — the `pgbouncer=true` param is required too; it tells Prisma to skip
   prepared statements, which Supavisor's transaction-pooling mode doesn't
   support. Any other hosted Postgres reachable over IPv4 works too, this
   is just what's already wired up.
2. **Import the repo**: [app.netlify.com](https://app.netlify.com) →
   **Add new site → Import an existing project** → pick this GitHub repo
   (`runadeesu/ReinAI888`) and the `claude/reinai-platform-dev-zo9kqq` branch
   (or `main` once merged). Netlify reads `netlify.toml` automatically —
   no build settings to fill in by hand.
3. **Set environment variables** under **Site configuration → Environment
   variables** (same names as `.env.example`):
   - `DATABASE_URL` — from step 1
   - `AUTH_SECRET`, `ENCRYPTION_KEY` — generate with the commands above
   - `NEXTAUTH_URL` — your Netlify URL, e.g. `https://your-site.netlify.app`
     (update this if you attach a custom domain)
   - `SMTP_*` — optional but recommended for production so verification/reset
     emails actually send instead of only logging server-side
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional, for Google login
   - `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` /
     `NVIDIA_API_KEY` — optional server-wide default provider keys; users can
     also add their own from Settings → API Keys regardless
   - Netlify Blobs needs no manual credentials — it's automatically
     available to Functions on a site once deployed there.
4. **Deploy.** `netlify.toml`'s build command is currently just `pnpm build`
   — it deliberately does *not* run `prisma migrate deploy` automatically.
   For this deployment, the schema was applied once directly against
   Supabase (via its SQL editor/MCP tooling) rather than through Prisma's
   own migration runner, so `_prisma_migrations` bookkeeping wasn't
   independently confirmed to match. Once you've verified (`npx prisma
   migrate status` against `DATABASE_URL`) that it does, change the
   command back to `npx prisma migrate deploy && pnpm build` so future
   schema changes apply automatically on every push.

If you'd rather I drive the deploy directly (Netlify CLI, non-interactively)
instead of the dashboard flow above, add a `NETLIFY_AUTH_TOKEN` (and either a
`NETLIFY_SITE_ID` for an existing site or let `netlify init` create one) to
this environment and say so — that's the only thing this repo can't do for
itself.

## Scripts

- `pnpm dev` — start the dev server
- `pnpm build` / `pnpm start` — production build/run
- `pnpm lint` — ESLint (flat config, Next.js + TypeScript rules)
- `npx prisma migrate dev` — create/apply a new migration after schema changes
- `npx prisma studio` — inspect the database

## ReinAI Code

`reinai-code/` is a companion desktop app — a real AI pair-programmer that
reads/writes files and runs shell commands in a local project folder (the
same tool-calling loop Claude Code/Codex CLI use), with a chat + file-tree
GUI instead of a terminal. It's an independent Electron project (its own
`pnpm-workspace.yaml`, dependency tree, and build), not part of this Next.js
app's build/deploy — see `reinai-code/README.md` for dev setup and how to
build the Windows installer/portable `.exe`.

## Roadmap (not in this pass)

The prompt behind this project asks for a full cross-platform suite (Web,
Windows/macOS/Linux desktop apps, Android/iOS, plus ReinAI Code — now built,
see above). This pass delivers a genuinely working, commercially-shaped web
core end to end; the following are natural next milestones on top of it,
intentionally not stubbed out here since a fake "coming soon" screen would
violate the no-placeholder goal of the project more than simply not building it
yet:

- **Desktop wrapper for the web app**: wrap this Next.js app with Tauri
  (small footprint, real installers via CI on each OS runner)
- **Mobile**: wrap with Capacitor for Android/iOS, or a React Native client
  reusing `src/lib` core logic
- **ReinAI Code polish**: inline diff review before applying file edits, a
  read/write code editor pane, conversation persistence, custom app icon
- **Realtime sync**: multi-device conversation sync via WebSockets/Pusher-style
  provider once a hosted backend is chosen
- **Image/video generation**: wire in provider-specific endpoints
  (e.g. image models) through the same provider-abstraction pattern
