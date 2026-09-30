# MiD Event Catalog

Events are facts, not commands. Every domain event must carry sufficient ownership context and be safe to retry when applicable.

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
- Unique event ID
- User/ownership context
- Occurrence timestamp
- Source
- Idempotency strategy where retryable
