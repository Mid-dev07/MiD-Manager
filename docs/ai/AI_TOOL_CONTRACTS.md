# MiD AI Tool Contracts

These are logical contracts for the first AI tool registry. The concrete domain service implementations belong to the Full-Stack Builder/System Architect and must remain the source of truth.

## Common Contract

All tools receive a server-generated execution context:

```ts
interface ToolExecutionContext {
  requestId: string;
  userId: string;
  actionLevel: "read" | "confirmed_action" | "limited_automation";
  authorization: AuthorizationSnapshot;
  idempotencyKey?: string;
  source: "web" | "telegram" | "whatsapp" | "internal";
}
```

The AI runtime passes no raw database connection, unrestricted SQL, or generic repository access to the model.

## Read Tools

### get_schedule

Purpose: return a bounded schedule window for the authenticated user.

Input:
- start datetime
- end datetime
- optional status/filter

Constraints:
- maximum bounded window
- user ownership enforced server-side
- return only fields needed by the requesting use case

### get_tasks

Purpose: return relevant tasks for planning/querying.

Input:
- optional date/deadline window
- optional status
- optional priority/project filter

Constraints:
- bounded result set
- user ownership enforced server-side

### get_finance_summary

Purpose: return summary information for a finance question.

Input:
- date window
- aggregation type

Constraints:
- do not expose unrelated transaction line items unless explicitly required
- high-sensitivity access
- audit metadata recommended

### get_goal

Purpose: retrieve one or more relevant goals.

Input:
- goal identifier or bounded selection
- optional progress window

Constraints:
- user ownership
- do not infer private health/financial data unless explicitly returned by the core domain

### get_habits

Purpose: retrieve habit state needed for planning or progress explanation.

### get_health_summary

Purpose: retrieve minimal health/activity information required for a permitted use case.

Constraints:
- high-sensitivity
- least-privilege fields
- audit metadata recommended

## Mutation Tools

### create_task

Input:
- title
- optional description
- due date/time
- priority
- project
- optional reminders

Required:
- validated input
- user authorization
- explicit confirmation unless the matching automation rule is active

Idempotency:
- required when a request may be retried after an uncertain response

### create_schedule

Input:
- title
- start/end or recurrence
- optional location/link
- optional reminder configuration

Required:
- conflict/business-rule validation
- explicit confirmation unless automation is enabled

### create_transaction

Input:
- account
- amount
- currency
- transaction date
- merchant/description
- category
- optional items/metadata

Required:
- highest scrutiny among the initial mutation tools
- explicit confirmation for all AI-extracted receipt data
- validation against account ownership and domain rules
- idempotency for retryable requests
- audit metadata

## Tool Result Shape

Prefer structured results:

```ts
interface ToolResult<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    retryable: boolean;
    userSafeMessage: string;
  };
  operationId?: string;
  idempotentReplay?: boolean;
}
```

The orchestrator must distinguish:
- planned call
- authorized call
- executed call
- confirmed success
- confirmed failure
- unknown outcome

“Tool call returned” does not mean “domain mutation succeeded”.

## Tool Registry Rules

1. Registry is server-side.
2. Tools are explicitly registered.
3. Each tool declares its schema and sensitivity.
4. Tool availability is filtered by permission before model invocation when possible.
5. Unknown tool names are rejected.
6. Arguments are validated before execution.
7. Domain services validate again.
8. Sensitive operations generate audit metadata.
9. Tool descriptions must not imply permissions the runtime has not granted.
