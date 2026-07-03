# Finora — AI Financial Coach

A personal AI financial coach for everyday Kenyan users. Users get calm, structured financial advice with a FREE or PRO plan, delivered via a streaming chat interface powered by GPT-4o-mini.

## Run & Operate

- `pnpm --filter @workspace/finora run dev` — run the frontend (port auto-assigned)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080 in dev)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required secret: `OPENAI_API_KEY` — OpenAI API key for the chat backend

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite, Tailwind CSS v4, Wouter (routing), TanStack React Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (tables: `conversations`, `messages`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- AI: OpenAI GPT-4o-mini via `openai` npm package, streaming SSE
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/finora/src/pages/home.tsx` — landing/plan picker page
- `artifacts/finora/src/pages/chat.tsx` — main chat interface with SSE streaming
- `artifacts/finora/src/components/formatted-message.tsx` — renders Finora's structured responses
- `artifacts/api-server/src/routes/openai/index.ts` — all AI chat endpoints + Finora system prompt
- `lib/db/src/schema/conversations.ts` — conversations table (id, title, plan, createdAt)
- `lib/db/src/schema/messages.ts` — messages table (id, conversationId, role, content, createdAt)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)

## Architecture decisions

- SSE streaming for chat responses — avoids long HTTP timeouts, gives real-time feel
- Plan (FREE/PRO) stored on the conversation, injected into the system prompt at request time
- Plan field is validated against an allowlist (`FREE`|`PRO`) server-side to prevent prompt injection
- Frontend SSE parser uses a line buffer to correctly handle events split across network chunks
- Finora system prompt lives in `artifacts/api-server/src/routes/openai/index.ts` — edit there to update AI behavior

## Product

- `/` — Landing page: explains Finora, FREE vs PRO plan picker, "Start Coaching" CTA
- `/chat?id={id}` — Full-screen AI chat with conversation history sidebar, streaming responses, FREE/PRO badge
- Finora responds with structured sections: **Insight**, **Meaning**, **Recommended Action**, **Optional Encouragement**
- Light Swahili mixed in naturally (e.g. "Karibu", "mshahara", "matumizi")

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any schema change in `lib/db/src/schema/`, run `pnpm run typecheck:libs` before checking artifact packages (stale declarations cause TS errors in routes)
- The `openai` package is a direct dependency of `@workspace/api-server` — not routed through `@workspace/integrations-openai-ai-server` client (which expects Replit AI Integration env vars)
- SSE endpoints cannot use generated React Query hooks — use raw `fetch` + `ReadableStream` on the client side
