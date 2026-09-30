# MiD Event Catalog

Events are facts, not commands. Every domain event carries sufficient ownership context and is immutable after publication. Retryable asynchronous processing uses at-least-once delivery and idempotent handlers.

## Event Semantics

### Command
A Command is an intent/request to perform an operation. It may succeed or fail and is not proof that the operation happened.

Examples:
- `CreateTask`
- `CompleteTask`
- `SyncGoogleTask`

### Domain Event
A Domain Event is an immutable fact that a domain operation has already occurred.

Examples:
- `TaskCreated`
- `TaskCompleted`
- `GoalCompleted`
- `HabitCompleted`

A domain event does not mean "please perform this action."

### Outbox Record
An Outbox Record is a durable database record containing a domain event that must be dispatched asynchronously. It is a delivery mechanism/persistence record, not a separate business event and not permanent business history by default.

### Async Message
An Async Message is the transport/work representation delivered to an asynchronous handler. It may carry a domain event for asynchronous reaction or represent requested asynchronous work.

Examples:
- `GoogleTaskSyncRequested`
- `SendNotification`
- `ProcessWebhook`

An async message is not automatically proof that its requested side effect succeeded.

### Handler
A Handler consumes an async message, validates it, performs the authorized side effect, and records the outcome as appropriate. Handlers must be idempotent because delivery is at-least-once.

## Canonical Outbox Lifecycle

```
Command
   ↓
Application Use Case
   ↓
Domain Operation
   ↓
┌──────────────────────────────┐
│ PostgreSQL Transaction       │
│                              │
│ Domain State Change          │
│          +                   │
│ Outbox Record                │
└──────────────────────────────┘
   ↓ commit
Outbox Dispatcher
   ↓
Async Transport / Cloudflare Queue
   ↓
Handler
   ↓
Side Effect
```

The three concepts are distinct:
```
Domain Event ≠ Outbox Record ≠ Queue Message
```
The outbox record persists the event for reliable dispatch; the queue message transports work/event data to a handler.

## Reliability Contract

### Atomicity
The domain state change and its corresponding outbox record MUST be written in the same PostgreSQL transaction. A committed domain change must not exist without its required outbox record, and an outbox record must not commit without the associated domain change.

### Delivery
Cloudflare Queue processing is treated as **at-least-once**. Consumers MUST tolerate duplicate delivery.

### Idempotency
Handlers MUST use an appropriate idempotency/deduplication strategy so duplicate messages do not produce duplicate business effects.

### Retry
Only transient/retryable failures are retried. Validation, authorization, malformed-message, and unsupported-operation failures must not be retried indefinitely. An asynchronous side-effect failure does not roll back or repeat the original domain transaction.

### DLQ
Poison or exhausted messages must be isolated for recovery/replay according to the operational contract, with sufficient metadata to identify the message, operation, user/ownership context, failure, attempts, and timestamps.

### Ordering
There is **no global event-ordering requirement**. Ordering is required only when a specific workflow has a causal dependency that cannot be safely handled by idempotent/version-aware processing. Such ordering must be scoped to that workflow rather than imposed globally.

## Event Catalog

## Identity
- UserRegistered
- UserLoggedIn
- MFAEnabled
- IdentityConnected
- IdentityDisconnected

## Schedule
- ScheduleCreated
- ScheduleUpdated
- ScheduleCancelled
- ScheduleStartingSoon

## Task
- TaskCreated
- TaskUpdated
- TaskCompleted
- TaskOverdue

## Finance
- ExpenseCreated
- IncomeCreated
- TransactionUpdated
- TransactionDeleted
- BudgetThresholdReached

## Goals & Habits
- GoalCreated
- GoalProgressChanged
- GoalAtRisk
- GoalCompleted
- HabitCompleted
- HabitMissed
- HabitConsistencyChanged

## Health
- ActivityStarted
- ActivityPaused
- ActivityCompleted

## Achievement
- AchievementUnlocked

## Integration/System
- SyncStarted
- SyncCompleted
- SyncFailed
- NotificationQueued
- NotificationDelivered
- AIActionRequested
- AIActionApproved
- AIActionExecuted

## Event Requirements
Every domain event MUST define:
- Unique event ID
- Event type and version
- Aggregate/entity identity
- User/ownership context where applicable
- Occurrence timestamp
- Source
- Correlation/idempotency metadata as required for retryable processing
- Immutable payload semantics
