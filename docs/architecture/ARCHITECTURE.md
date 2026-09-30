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

## Canonical Runtime Path
```
React + Vite
      ↓
Cloudflare Worker + Hono
      ↓
Application Layer
      ↓
Domain Modules
      ↓
Supabase PostgreSQL
```

Asynchronous work uses:
```
Domain Transaction
      ↓
Outbox
      ↓
Dispatcher
      ↓
Cloudflare Queue
      ↓
Idempotent Handler
```

## Rules
1. MiD core is the source of truth for internal domains.
2. External providers never become core domain dependencies.
3. AI never becomes the source of truth for deterministic business data.
4. All user-owned data requires explicit ownership/authorization.
5. External failures must not corrupt core state.
6. Idempotency is required for retryable external/event operations.
7. Heavy/slow work is asynchronous.
8. Cross-module access uses public application/domain contracts or domain events; modules must not access another module's private implementation, repository, or tables directly.
9. AI uses typed tools and application services; AI must not access PostgreSQL or arbitrary SQL directly.
10. Identity, Profile, Preferences, and Privacy/Permissions are logical ownership boundaries within the same modular monolith and database.

## Domain Modules
Identity; Profile; Preferences; Schedule; Task; Finance; Health; Goal; Habit; Achievement; Notification; Integration; AI.

Priority Engine is not an independent domain module. It is deterministic computation owned by the Task domain/application boundary. It operates on task-owned data and may consume explicitly exposed read-only contextual signals through public contracts. It returns a priority result/explanation for application use; it does not own an independent persisted aggregate and AI does not own or determine its business rules.

## Priority Engine Contract
- **Owner:** Task domain/application boundary.
- **Inputs:** Task-owned fields required for prioritization (for example status, deadline, explicit priority, dependencies) plus only explicitly exposed read-only contextual signals from other modules when a product rule requires them.
- **Output:** A deterministic priority result and explainable factors for application/UI use.
- **Persistence:** No independent Priority aggregate or Priority-owned source-of-truth table. Any persisted task priority remains Task-owned.
- **Cross-module interaction:** Other modules do not call Task repositories directly; contextual data is exposed through public contracts/application queries.
- **Testing boundary:** Unit-test the deterministic computation independently; application tests verify contract inputs/outputs and authorization; integration tests verify that cross-module context is consumed only through public contracts.

## Future Scaling
Do not introduce microservices until evidence shows a real need.
