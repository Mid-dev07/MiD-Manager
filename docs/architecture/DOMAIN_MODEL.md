# MiD Domain Model

The model uses logical ownership boundaries inside one modular monolith and one Supabase PostgreSQL database. A concept listed under a module is owned by that module; other modules interact through public contracts/application services or domain events rather than private repositories or direct table access.

## Identity
Authentication identity, Session, MFA, ConnectedIdentity.

## Profile
Profile data such as name, avatar, and presentation-oriented metadata.

## Preferences
Locale, timezone, planning preferences, notification preferences, UX preferences, and behavioral preferences.

## Privacy / Permissions
Privacy settings, AI permissions, and permission-related user controls. These controls do not grant the AI authority to elevate its own permissions.

## Schedule
Schedule, ScheduleOccurrence, Reminder, ScheduleConflict, ScheduleLink.

## Task
Task, Subtask, TaskDependency, TaskStatus, TaskPriority, TaskReminder, Project.

### Priority Engine
Priority Engine is deterministic computation owned by the Task domain/application boundary. It is not an independent domain module or persisted aggregate. It evaluates Task-owned inputs and, where required by a product rule, explicitly exposed read-only contextual signals through public contracts. It returns a priority result and explainable factors for application/UI use. Persisted task priority remains Task-owned.

## Finance
FinancialAccount, Transaction, TransactionItem, Category, Budget, FinancialGoal, RecurringTransaction, Receipt, FinancialInsight.

## Health
HealthProfile, HealthMetric, Activity, ActivityRoute, ActivitySession, ActivityMetric, HealthSource.

## Goals
Goal, GoalMilestone, GoalMetric, GoalProgress, GoalStatus, GoalRisk.

## Habits
Habit, HabitSchedule, HabitCompletion, HabitTarget, HabitStreak, HabitConsistency.

## Achievement
AchievementDefinition, AchievementUnlock, AchievementEvent.

## Integration
IntegrationConnection, ExternalResource, SyncState, SyncMapping, WebhookEvent, IntegrationPermission.

## Notification
Notification, NotificationPreference, ReminderRule, Delivery, QuietHours.

## AI
AIRequest, AIContext, AITool, AIPermission, AIMemory, AIAction, AIApproval, AIExecution, AIInsight.

## Ownership Rules
- Single PostgreSQL remains the persistence foundation; logical module ownership does not require separate databases or services.
- User-owned records require explicit ownership and authorization.
- A module must not directly access another module's private repository or tables.
- Cross-module reads/writes use the owning module's public contract/application service, or domain events where asynchronous reaction is appropriate.
- Authorization is enforced independently of editable Profile or Preferences data.
