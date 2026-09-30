# MiD Manager

Personal self-management system built with a free-tier-first architecture.

## Technical bootstrap

This branch contains the executable foundation for the approved architecture:

- React + Vite frontend
- Cloudflare Worker + Hono transport
- application/domain/infrastructure boundaries
- Supabase Auth boundary
- versioned Supabase migrations and RLS foundation
- outbox/queue/cron infrastructure contracts
- structured request/error logging
- Vitest unit and architecture tests
- GitHub Actions CI

Feature implementation remains intentionally out of scope.

## Development

Copy `.env.example` to `.env`, install with `npm install`, then run `npm run dev`.

## Verification

Bootstrap verification is CI-authoritative; local execution remains recommended when the required toolchain is available.

`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npx wrangler deploy --dry-run`, `supabase db reset`, and `supabase test db` are the bootstrap verification commands.

Next milestone: **Auth → Profile → Dashboard Shell → Basic Daily Schedule**.

See `docs/` for canonical product, architecture, security, AI, QA, and governance documents.
Authenticated auth boundary verification is executed in CI against the local Supabase Auth stack.
