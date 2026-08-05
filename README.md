# ReinAI

ReinAI is an AI開発プラットフォーム (AI development platform) — a self-hosted,
ChatGPT/Claude-style web app purpose-built for software development: multi-provider
AI chat, project/folder-organized conversations, reusable prompt templates, file
upload & analysis, and encrypted per-user API key management. Every feature in this
codebase talks to a real database, a real auth system, and real AI provider APIs —
there is no mock or placeholder data.

## Stack

- **Next.js 15** (App Router, TypeScript) — `src/app`
- **Prisma + SQLite** by default (swap the `provider` in `prisma/schema.prisma` and
  `DATABASE_URL` for Postgres/MySQL in production) — `prisma/schema.prisma`
- **Auth.js v5** — credentials (bcrypt) + Google OAuth, email verification,
  password reset, TOTP 2FA, server-side session tracking/revocation — `src/auth.ts`
- **Vercel AI SDK** (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`)
  for streaming chat across providers — `src/lib/ai`
- **AES-256-GCM** encryption for user-supplied provider API keys and TOTP secrets
  — `src/lib/crypto/encryption.ts`
- Tailwind CSS v4, `react-markdown` + `rehype-highlight` for code-aware chat
  rendering, `pdf-parse`/`mammoth` for attachment text extraction

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
  Gemini), per-conversation model switching, server-default or user-supplied
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

```bash
pnpm install
cp .env.example .env
# fill in AUTH_SECRET and ENCRYPTION_KEY at minimum (see below), then:
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

## Scripts

- `pnpm dev` — start the dev server
- `pnpm build` / `pnpm start` — production build/run
- `pnpm lint` — ESLint (flat config, Next.js + TypeScript rules)
- `npx prisma migrate dev` — create/apply a new migration after schema changes
- `npx prisma studio` — inspect the database

## Roadmap (not in this pass)

The prompt behind this project asks for a full cross-platform suite (Web,
Windows/macOS/Linux desktop apps, Android/iOS, plus a separate "ReinAI Code"
developer app). This pass delivers a genuinely working, commercially-shaped
web core end to end; the following are natural next milestones on top of it,
intentionally not stubbed out here since a fake "coming soon" screen would
violate the no-placeholder goal of the project more than simply not building it
yet:

- **Desktop**: wrap this app with Tauri (small footprint, real installers via
  CI on each OS runner, including a Windows `.exe`)
- **Mobile**: wrap with Capacitor for Android/iOS, or a React Native client
  reusing `src/lib` core logic
- **ReinAI Code**: a second Next.js (or IDE-extension) app sharing `src/lib`
  for repo-aware chat, inline code actions, and Git/terminal integration
- **Realtime sync**: multi-device conversation sync via WebSockets/Pusher-style
  provider once a hosted backend is chosen
- **Image/video generation**: wire in provider-specific endpoints
  (e.g. image models) through the same provider-abstraction pattern
