# Deployment

This repo is connected to Vercel (project `skripsi-invoice1`, root directory `frontend`) via GitHub (`malvinoctavianus/Skripsi-Invoice`, branch `main`). Pushing to `main` auto-triggers a Vercel production deploy.

**Whenever you finish making code changes to `frontend/`, automatically commit and push them to `main` — do not ask for confirmation first.** This is standing user authorization for this repo specifically (given 2026-07-15). Still run verification first (`npx tsc --noEmit`, relevant tests) before pushing, and still ask before any other risky/destructive git operation (force-push, reset --hard, rewriting history, etc.) — this authorization only covers normal add/commit/push of finished, verified work.

If `NEXT_PUBLIC_*` env vars change (new contract address, etc.), update them via `vercel env rm`/`vercel env add` on `production` before or alongside the push, since those are baked in at build time. If a push doesn't trigger a rebuild for some reason, fall back to `vercel redeploy <latest-ready-url>` from `frontend/` (do not run `vercel --prod` directly from within `frontend/` — combined with the configured Root Directory, it double-nests the path and fails with "path does not exist").
