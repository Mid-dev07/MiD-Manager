# MiD Architecture

## Baseline
- Frontend: React + TypeScript + Vite
- API/runtime: Cloudflare Workers + Hono
- Database/auth: Supabase PostgreSQL + Supabase Auth
- Storage: Supabase Storage initially
- Async processing: Cloudflare Queues
- Scheduled jobs: Cloudflare Cron Triggers
- Testing: Vitest + Playwright
- Deployment: Cloudflare Workers + Static Assets

## Architecture Style
Modular monolith first, with internal event-driven boundaries and an adapter-based integration hub.

## Rules
1. MiD core is the source of truth for internal domains.
2. External providers never become core domain dependencies.
3. AI never becomes the source of truth for deterministic business data.
4. All user-owned data requires explicit ownership/authorization.
5. External failures must not corrupt core state.
6. Idempotency is required for retryable external/event operations.
7. Heavy/slow work is asynchronous.

## Domain Modules
Identity; Schedule; Task; Priority; Finance; Health; Goal; Habit; Achievement; Notification; Integration; AI.

## Future Scaling
Do not introduce microservices until evidence shows a real need.
