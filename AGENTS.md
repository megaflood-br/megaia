<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Nexo is a single Next.js 16 (App Router) app — a multitenant SaaS for AI customer-service agents. There is one service to run; standard commands live in `package.json` and `README.md`.

- Dependencies are installed by the startup update script (`npm install`, which runs `prisma generate` via `postinstall`). The SQLite DB is a gitignored local file (`prisma/dev.db`); it is NOT recreated by the update script.
- First-time DB setup / reseed: run `npm run db:setup` (`prisma db push` + seed). If login fails or the DB is missing, run this. Seeded demo login: `demo@nexo.app` / `demo1234`.
- The dev server (`npm run dev`, port 3000, Turbopack) is not auto-started; launch it under tmux when you need it.
- `npm run build` and `npm run dev` both write to `.next/`; do not run them at the same time.
- `OPENAI_API_KEY` and Evolution API (WhatsApp) creds are optional. With no `OPENAI_API_KEY`, the in-panel test chat (`/api/chat/test`) returns a canned demo reply, so the full agent/chat flow is testable without external services. Set the key only for real AI responses.
- `next dev`/`next build` auto-manage the `<!-- BEGIN:nextjs-agent-rules -->` block in this file (and `CLAUDE.md`); they only rewrite that block and preserve this section. `AGENTS.md` is intentionally tracked (removed from `.gitignore`) so these notes persist.
- The committed `.env.example` values are sufficient for local dev; copy to `.env` (the update script does this only if `.env` is missing).
