# Orbit self-host

React 19, Next.js, Node 24 and local SQLite. Answer in Portuguese.

- Preserve Markdown, account data and optimistic workspace revisions.
- All data APIs require a valid local session or MCP bearer token.
- Keep data/, databases, backups, tokens and .env files out of Git and Docker builds.
- Each installation starts with empty pages and tasks.
- Inter Variable, Lucide SVG, no emojis.
- Run npm test, npm run typecheck and npm run build before shipping.
- Setup credentials are generated locally. Never add production credentials or personal content to fixtures.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
