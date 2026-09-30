# MiD Decision Log

## ADR-0001 — Free-Tier-First
Core functionality must operate on free-tier services during personal/MVP development. Paid or provider-dependent integrations remain optional.

## ADR-0002 — Cloudflare + Supabase
Cloudflare handles application delivery/runtime; Supabase handles PostgreSQL, Auth, and initial Storage.

## ADR-0003 — Modular Monolith First
Do not introduce microservices until evidence requires them.

## ADR-0004 — AI Is Optional to Core Operation
MiD must remain functional when AI is unavailable.

## ADR-0005 — AI Actions Require User Control
AI recommendations/changes default to suggest/draft/confirm. Autonomous behavior requires explicit automation permission.

## ADR-0006 — MiD as Source of Truth
Internal domain state belongs to MiD. External providers are integrations/mirrors/interfaces.

## ADR-0007 — Independent Quality Gates
Builder agents do not provide the final release judgment. Security, QA, UX/visual review, and a final gatekeeper provide independent verification.


## ADR-008 — Domain Dependency Rules

### Problem
MiD uses a modular monolith, so domain boundaries must remain explicit even though modules share one runtime and PostgreSQL database. Without explicit dependency rules, implementation can create private cross-module coupling, circular dependencies, or infrastructure-driven domain design.

### Decision
MiD uses explicit logical domain ownership inside a modular monolith.

Canonical dependency direction:
```
API / Transport
      ↓
Application / Use Case
      ↓
Owning Domain Module
      ↓
Repository / Persistence Adapter
      ↓
PostgreSQL
```

Application/use-case code is the orchestration boundary. Domain logic must not depend on infrastructure implementations.

Cross-module interaction is allowed only through the owning module's public application/domain contract or through domain events when asynchronous reaction is appropriate.

Forbidden:
- direct access to another module's private implementation
- direct access to another module's repository
- direct access to another module's tables
- arbitrary shared business services that bypass ownership
- circular synchronous domain dependencies

Identity, Profile, Preferences, Privacy/Permissions, Task, and other modules retain their documented ownership boundaries.

AI is an intelligence/orchestration layer and is not a source of truth for deterministic business data.

### Context / Rationale
The modular monolith preserves a simple MVP deployment while explicit contracts prevent the shared runtime/database from becoming an excuse for unrestricted coupling.

### Consequences
- Modules remain independently understandable and testable.
- Cross-module changes require an explicit contract or event.
- Some orchestration code belongs in the application layer rather than inside a domain module.
- Splitting into services later remains possible without making service boundaries a current requirement.

### Scope / Boundaries
This ADR defines dependency direction only. It does not introduce new domains, services, databases, or infrastructure.

## ADR-009 — Identity / Profile / Preferences Boundary

### Problem
Account identity, user-facing profile information, behavioral preferences, and permission controls have different ownership semantics. Ambiguous ownership can cause authorization to depend on editable presentation data or place preferences in the identity boundary.

### Decision
Ownership is divided as follows:

**Identity**
- authentication identity
- account identity
- session
- MFA
- connected identity

**Profile**
- name
- avatar
- presentation-oriented metadata
- user-facing profile information

**Preferences**
- locale
- timezone
- planning preferences
- notification preferences
- UX preferences
- behavioral preferences

**Privacy / Permissions**
- privacy settings
- AI permissions
- authorization-related user controls

`UserPreference` is Preferences-owned, not Identity-owned.

Authorization must not depend on editable Profile or Preferences data, and AI cannot elevate its own permissions.

### Context / Rationale
Separating authentication identity from presentation and behavioral state keeps security boundaries stable while allowing user-facing information and preferences to change independently.

### Consequences
- Identity remains security-sensitive and authorization-relevant.
- Profile changes do not redefine account identity.
- Preference changes do not grant permissions.
- AI permission checks remain system/application-controlled.

### Scope / Boundaries
These are logical ownership boundaries within the same modular monolith and PostgreSQL database. This ADR does not require separate services or databases.

## ADR-010 — Event Delivery + Outbox

### Problem
Domain changes that require asynchronous processing must not lose their corresponding event when application state commits successfully. External and asynchronous failures must also remain isolated from the original domain transaction.

### Decision
Reliable asynchronous event delivery uses a transactional outbox.

Canonical lifecycle:
```
Command
  ↓
Application Use Case
  ↓
Domain Operation
  ↓
PostgreSQL Transaction
  ├── Domain State Change
  └── Outbox Record
  ↓ commit
Outbox Dispatcher
  ↓
Cloudflare Queue
  ↓
Handler
  ↓
Side Effect
```

The domain state change and required outbox record MUST be written in the same PostgreSQL transaction.

Delivery is at-least-once. Handlers MUST be idempotent or use an equivalent deduplication/version-aware strategy.

Transient/retryable failures may be retried. Validation, authorization, malformed-message, and unsupported-operation failures must not be retried indefinitely. Exhausted or poison messages are isolated through the DLQ/recovery mechanism.

There is no global ordering guarantee. Ordering is introduced only for workflows that have a concrete causal dependency that cannot safely rely on idempotent/version-aware processing.

### Context / Rationale
The outbox pattern provides durable handoff from committed domain state to asynchronous processing without requiring distributed transactions.

### Consequences
- A committed domain change has its required outbox record.
- Duplicate delivery is expected and must be safe.
- Asynchronous side-effect failure does not roll back or repeat the original domain transaction.
- Operational recovery must preserve enough metadata for diagnosis and replay.

### Scope / Boundaries
The outbox is an operational delivery mechanism, not permanent business history by default. Queue and handler implementations remain infrastructure concerns.

## ADR-011 — Domain Event vs Async Message

### Problem
Commands, domain facts, durable outbox records, and queue messages have different semantics. Treating them as interchangeable makes it unclear whether an operation was requested, completed, persisted for dispatch, or merely queued.

### Decision
The terms have the following canonical meanings:

**Command**
An intent/request to perform an operation. It may succeed or fail and is not proof that the operation happened.

**Domain Event**
An immutable fact that a domain operation has already occurred. Examples include `TaskCreated` and `TaskCompleted`.

**Outbox Record**
A durable PostgreSQL record containing the event representation required for reliable asynchronous dispatch. It is a delivery/persistence record, not a separate business event and not permanent business history by default.

**Async Message**
A transport/work representation delivered to an asynchronous handler. It may carry a domain event for asynchronous reaction or represent requested asynchronous work such as `GoogleTaskSyncRequested` or `SendNotification`. It is not proof that a requested side effect succeeded.

**Handler**
A consumer that validates an async message, applies authorization and contract checks, performs the permitted processing/side effect, and records the outcome as appropriate. It must tolerate at-least-once delivery.

Canonical distinction:
```
Domain Event ≠ Outbox Record ≠ Async Message
```

### Context / Rationale
Semantic separation prevents false success states and keeps event-driven processing understandable across domain and infrastructure boundaries.

### Consequences
- Commands represent intent.
- Domain events represent completed facts.
- Outbox records provide reliable persistence for dispatch.
- Queue messages represent transport/work.
- Success must not be inferred merely because a command or message exists.

### Scope / Boundaries
This ADR defines semantics and naming. It does not require event sourcing, full CQRS, or a separate event store.

## ADR-012 — Database Conventions

### Problem
A shared PostgreSQL database needs explicit ownership and safety conventions so modular boundaries remain enforceable while implementation avoids inconsistent identifiers, timestamps, constraints, and migration practices.

### Decision
PostgreSQL is the persistence source of truth for MiD internal domain state.

Canonical conventions:
- Logical table ownership follows domain ownership.
- User-owned records require an explicit ownership strategy.
- Primary keys use UUIDs unless a documented implementation-level requirement justifies otherwise.
- Time-bearing records use PostgreSQL `timestamptz`; timezone-sensitive product semantics are preserved rather than silently converted to a server-local timezone.
- Foreign keys and database constraints are used to enforce valid relationships where appropriate.
- Uniqueness constraints are used for invariants that must hold at the database boundary.
- Indexes are added from actual query/access patterns rather than speculatively.
- Sensitive operations retain appropriate audit metadata.
- RLS and backend authorization are both required for applicable user-owned data; frontend visibility is never a security boundary.
- Application-level idempotency persistence is used where retryable operations require durable deduplication.
- Outbox records are persisted in PostgreSQL and participate in the same transaction as the domain mutation they represent.
- Schema changes use ordered, versioned migrations.
- Schema evolution must preserve documented ownership and authorization boundaries.

Soft-delete versus hard-delete is not globally fixed by this ADR. Each domain operation must follow its product/legal semantics; where retention or recovery requirements exist, the choice must be made explicitly at implementation level.

### Context / Rationale
These conventions establish stable database safety rules without creating separate databases per domain or prematurely fixing every table shape.

### Consequences
- Shared PostgreSQL remains simple for MVP.
- Database constraints and RLS reinforce, rather than replace, application authorization.
- Query-driven indexing avoids speculative infrastructure.
- Some table-level choices remain intentionally implementation-level decisions.

### Scope / Boundaries
This ADR does not prescribe a complete schema, table list, ORM, migration tool, or database-per-domain architecture.

## ADR-013 — Integration Sync Contract

### Problem
External providers have different APIs, identifiers, availability, and failure modes. Core MiD domains must remain stable and authoritative without becoming coupled to provider-specific implementations.

### Decision
Integrations use an adapter boundary:

```
MiD Core
   ↓
Integration Contract
   ↓
Provider Adapter
   ↓
External Provider
```

Provider-specific API models, credentials, SDK concerns, and transport behavior remain inside the adapter/infrastructure boundary.

MiD core domain state is the source of truth by default. External providers are authoritative only for explicitly external-owned attributes that are intentionally represented as such; provider data does not implicitly become authority for MiD core state.

Provider identifiers are stored as integration/external-resource data and are not substitutes for MiD domain identifiers.

Sync direction, conflict policy, external deletion behavior, recurrence handling, timezone semantics, retry policy, and reconciliation behavior must be defined per integration contract before that integration's implementation. The default rule is that provider failure or outage must not corrupt or invalidate committed MiD core state.

Retryable sync operations require idempotency and bounded retry behavior. Reconciliation must be able to detect missing, changed, duplicated, or stale external mappings without bypassing domain ownership.

Google/calendar-style integrations preserve the MiD-versus-provider ownership boundary; provider-specific API details remain implementation-level adapter concerns unless explicitly documented by a future integration contract.

Telegram and WhatsApp are channel/integration adapters, not core domain modules or sources of truth.

### Context / Rationale
Adapters isolate provider volatility and allow core domains to remain testable and operational when external providers are unavailable.

### Consequences
- Core domains do not import provider implementations.
- Provider outages are isolated from core state.
- Each integration requires an explicit mapping and sync contract before implementation.
- Some provider-specific conflict and deletion rules remain intentionally integration-level decisions until the relevant provider flow is specified.

### Scope / Boundaries
This ADR does not introduce a generic integration platform or prescribe provider-specific API implementation details that are not yet decided.

## ADR-014 — Reminder / Notification / Alarm Semantics

### Problem
A reminder intent, a generated notification, and an actual delivery attempt are different lifecycle concepts. Conflating them makes cancellation, rescheduling, quiet hours, retries, and channel delivery difficult to reason about.

### Decision
The canonical semantic model is:

**Reminder**
A scheduling/domain intent that the user should be reminded about something.

**Notification**
A logical application communication generated from a reminder or relevant business event.

**Delivery**
An actual delivery attempt through a channel/provider.

**Alarm**
A platform-specific mechanism used to surface a reminder at or near a scheduled time. An alarm is not a separate business source of truth; its state derives from reminder/application intent.

Canonical lifecycle:
```
Domain Event / Domain State
        ↓
Reminder Rule / Reminder Intent
        ↓
Notification
        ↓
Delivery
        ↓
Channel / Provider
```

Creating or rescheduling a reminder updates future intent. Cancellation prevents future notification/delivery generated from that intent. Historical delivery records are not erased merely because future delivery is cancelled.

Quiet hours defer eligible notification delivery according to user preference; they do not change the underlying domain fact or reminder intent.

Delivery retries are idempotent and must not mutate the originating domain state. Deduplication is required where repeated event processing could create duplicate notifications.

### Context / Rationale
Separating intent, communication, and delivery isolates channel failures and makes lifecycle behavior explicit.

### Consequences
- Reminder is not a Notification.
- Notification is not a Delivery.
- Delivery failure does not imply domain rollback.
- Channel/provider changes do not redefine reminder ownership.
- Native/platform alarm mechanisms remain replaceable implementation details.

### Scope / Boundaries
Ownership follows the existing domain model: Schedule owns `Reminder` and schedule-triggered reminder intent; Notification owns `ReminderRule`, `Notification`, `Delivery`, and `QuietHours`; Task retains `TaskReminder` as task-owned linkage. This ADR does not create a new Alarm domain or require a specific client platform.

## ADR-015 — Infrastructure Connection Strategy

### Problem
Infrastructure choices can leak into domain logic unless connection boundaries are explicit. MiD needs a stable runtime path while keeping database, queue, scheduling, external providers, and AI providers replaceable behind application/infrastructure boundaries.

### Decision
The canonical application path is:

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
Application / Domain Transaction
      ↓
Outbox
      ↓
Cloudflare Queue
      ↓
Worker Handler
```

Scheduled work uses:

```
Cloudflare Cron
      ↓
Bounded Worker Job
```

Storage uses Supabase Storage where the documented product capability requires object storage.

External integrations connect through the Integration Contract and provider adapters. AI providers connect through the internal AI gateway/provider abstraction and remain outside domain logic.

Infrastructure is an implementation boundary. Domain code must not depend on Cloudflare, Supabase SDK details, provider SDKs, or model-provider APIs. Configuration and secrets remain outside domain logic and are supplied through the runtime/application infrastructure boundary.

Application code owns authorization and orchestration; infrastructure adapters perform transport/persistence/provider-specific work. This preserves testability and does not change domain ownership.

### Context / Rationale
The selected runtime keeps the MVP deployment simple and consistent with the existing Cloudflare + Supabase decision while preventing infrastructure coupling from spreading into domains.

### Consequences
- Runtime infrastructure can evolve without redefining domain boundaries.
- Provider-specific concerns stay in adapters.
- Core functionality does not require an always-running process.
- Scheduled jobs remain bounded; no autonomous agent loop is introduced.

### Scope / Boundaries
This ADR does not add infrastructure technologies, microservices, always-running workers, or a separate database/service per domain.
