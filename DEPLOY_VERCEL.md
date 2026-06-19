# Deploying Finora to Vercel

Finora is built with TanStack Start. The Lovable Vite wrapper
(`@lovable.dev/vite-tanstack-config`) already supports Vercel — it skips
Cloudflare-specific bundling outside the Lovable build context and lets
nitro auto-detect the deploy target via `NITRO_PRESET` / Vercel's CI env.

`vercel.json` in this repo pins `NITRO_PRESET=vercel` at build time, so no
dashboard tweaks are needed beyond connecting the repo and adding env vars.

## 1. Push the project to GitHub

In the Lovable editor: **GitHub → Connect → Create repository**. Push.

## 2. Import the repo on Vercel

1. https://vercel.com/new → **Import** your GitHub repo.
2. **Framework Preset**: leave as **Other** (the `vercel.json` already
   declares `framework: null` and the correct build command). Don't pick
   "Vite" — that overrides the output adapter.
3. **Build command**, **Install command**, **Output directory**: leave the
   Vercel defaults. `vercel.json` already sets build/install; Nitro's Vercel
   preset writes its own `.vercel/output/` that Vercel picks up automatically.

## 3. Environment variables (Vercel → Settings → Environment Variables)

Set these for **Production**, **Preview**, and **Development**:

| Name | Where to get it | Exposed to browser? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env` in this repo | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` in this repo | Yes |
| `VITE_SUPABASE_PROJECT_ID` | `.env` in this repo | Yes |
| `SUPABASE_URL` | same as `VITE_SUPABASE_URL` | No |
| `SUPABASE_PUBLISHABLE_KEY` | same as `VITE_SUPABASE_PUBLISHABLE_KEY` | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Lovable Cloud is managed — **not available on Lovable Cloud**. Skip this unless you've moved to a self-managed Supabase project. | No |
| `LOVABLE_API_KEY` | Lovable Cloud is managed — **not available off-platform**. To use AI features on Vercel, set an `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` of your own and swap the provider helper in `src/lib/ai-gateway.server.ts`. | No |

`VITE_*` vars are bundled into the browser at build time, so they must be
present **before** the Vercel build runs.

## 4. After first deploy

- Confirm the auth redirect URL in Supabase Auth settings includes your
  Vercel domain (`https://<project>.vercel.app` and any custom domain).
- Verify M-Pesa SMS ingest hits `https://<your-vercel-domain>/api/public/mpesa-sms`.

## Important caveats

- **Lovable's Publish button still ships to Cloudflare.** Vercel is a
  parallel deploy. Treat GitHub as the source of truth and Vercel as the
  production host.
- **AI Gateway**: `LOVABLE_API_KEY` only works inside Lovable Cloud. On
  Vercel, AI calls will fail with "Missing LOVABLE_API_KEY" until you swap
  the provider as described above.
- **Don't pin `NITRO_PRESET` inside `vite.config.ts`** — the Lovable wrapper
  force-enables nitro when you do, which slows local dev. `vercel.json` is
  the right place.
