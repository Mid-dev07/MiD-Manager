# MiD Manager

Personal self-management system built with a free-tier-first architecture.

## Technical foundation and first vertical slice

The repository contains the verified technical foundation plus the Profile Management vertical slice:

- React + Vite frontend
- Cloudflare Worker + Hono transport
- application/domain/infrastructure boundaries
- Supabase Auth boundary
- versioned Supabase migrations and RLS foundation
- outbox/queue/cron infrastructure contracts
- structured request/error logging
- Vitest unit and architecture tests
- GitHub Actions CI
- authenticated Profile read/update flow with PostgreSQL/RLS

Feature work remains intentionally bounded by vertical-slice scope and independent quality gates.

## Development

Copy .env.example to .env, install with npm install, then run npm run dev.

## Verification

CI is authoritative for the repository verification matrix. Core local commands are npm run typecheck, npm run lint, npm run test, npm run build, npx wrangler deploy --dry-run, supabase db reset, and supabase test db.

Next milestone: Independent Profile Review, then Dashboard Shell and Basic Daily Schedule.

See docs/ for canonical product, architecture, security, AI, QA, and governance documents.
