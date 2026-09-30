# MiD AI Implementation Specification

## 1. Purpose

The AI layer is an optional intelligence/orchestration boundary over MiD core domains.

Invariant:

> AI can propose, explain, extract, and orchestrate. MiD core remains the source of truth.

If the AI provider, gateway, memory, or AI-specific storage is unavailable, deterministic MiD features must continue to work.

## 2. Runtime Flow

User input
-> Interaction adapter
-> Request normalization
-> Intent classification
-> Context Builder
-> Permission evaluation
-> AI Orchestrator
-> Tool selection
-> Tool authorization + schema validation
-> MiD core operation
-> Result validation
-> User-facing response
-> Audit/telemetry

No model output may directly mutate a core domain.

## 3. Action Levels

| Level | Meaning | Default |
| --- | --- | --- |
| Read | Retrieve permitted context | Allowed |
| Suggest | Produce recommendation/analysis | Allowed |
| Draft | Prepare a proposed change | Allowed |
| Confirmed Action | Execute after explicit user approval | Required for mutations |
| Limited Automation | Execute inside an explicitly configured rule | Explicit opt-in only |

A missing/unclear permission must fail closed to a non-mutating response.

## 4. Provider Abstraction

The core application must depend on an internal interface, never on a provider SDK directly.

Conceptual contract:

```ts
interface AIProvider {
  readonly id: string;
  generate(input: AIModelInput, options: AIModelOptions): Promise<AIModelOutput>;
  supports(capability: AICapability): boolean;
}

type AICapability =
  | "text"
  | "image"
  | "voice-transcription"
  | "structured-output"
  | "tool-calling";
```

Provider selection belongs to the AI gateway and must be configuration-driven.

Required gateway behavior:
- provider/model can be changed without changing MiD domain code
- optional fallback chain
- per-use-case model policy
- timeout and retry budget
- token/input/output budget
- usage accounting
- provider health state
- deterministic failure mapping

No provider key may reach the browser or be stored in prompts, logs, or model-visible context.

## 5. AI Request Envelope

Every AI invocation should carry a server-created envelope:

```ts
interface AIRequest {
  requestId: string;
  userId: string;
  channel: "web" | "telegram" | "whatsapp" | "internal";
  actionLevel: "read" | "suggest" | "draft" | "confirmed_action" | "limited_automation";
  intent?: string;
  input: AIInput;
  context: AIContext;
  permissions: AIPermissionSnapshot;
  policy: AIPolicySnapshot;
  createdAt: string;
}
```

The user/client may provide intent hints, but cannot authoritatively grant permissions or elevate action level.

## 6. Context Builder

Context is constructed server-side from allowlisted context providers.

### Rules

- relevant: include only data needed for the current intent
- minimal: prefer summaries and bounded windows
- current: use fresh domain reads where correctness matters
- permission-aware: omit data the AI is not allowed to inspect
- source-tagged: every context block identifies its source domain
- expiration-aware: stale context must not be treated as current truth

Conceptual interface:

```ts
interface ContextProvider<T> {
  id: string;
  canProvide(intent: string): boolean;
  build(input: ContextBuildInput): Promise<ContextBlock<T>>;
}
```

Example context for “plan my afternoon”:
- current time and timezone
- today's schedule
- open tasks and deadlines
- relevant goal(s)
- configured planning preferences
- available time windows

Do not include:
- unrelated finance history
- full health history
- all past conversations
- unrelated records simply because they are available

## 7. Permission Model

Permissions are evaluated before tool execution and again at the execution boundary.

Recommended dimensions:

- user
- domain
- capability
- action level
- resource scope
- automation rule
- sensitivity
- expiry/revocation state

Example:

```ts
interface AIPermission {
  userId: string;
  capability: string;
  actionLevel: "read" | "suggest" | "draft" | "confirmed_action" | "limited_automation";
  resourceScope: "self" | "selected";
  enabled: boolean;
  expiresAt?: string;
}
```

The model can request a tool. It cannot grant itself permission.

## 8. Tool Design

Every AI tool is a narrow server-side adapter over a MiD domain service.

Initial tool set:

- get_schedule
- get_tasks
- get_finance_summary
- get_goal
- get_habits
- get_health_summary
- create_task
- create_schedule
- create_transaction

Tool contract requirements:

```ts
interface AITool<I, O> {
  name: string;
  description: string;
  inputSchema: Schema<I>;
  outputSchema: Schema<O>;
  sensitivity: "low" | "medium" | "high";
  actionLevel: "read" | "confirmed_action" | "limited_automation";
  execute(input: I, ctx: ToolExecutionContext): Promise<O>;
}
```

Each tool must:
- authenticate the caller
- authorize resource ownership
- validate arguments
- enforce domain business rules
- reject unsupported/ambiguous identifiers
- be idempotent where retries can duplicate effects
- return structured results
- emit an audit event when sensitive or mutating

The tool layer must never expose generic database query capability to the model.

## 9. Validation Boundary

The following boundaries are mandatory:

1. model output schema validation
2. tool argument schema validation
3. server authorization
4. domain validation/business rules
5. post-execution result validation

A successful model response is not evidence that a business operation succeeded.

The client should render only the server-confirmed result.

## 10. Memory

Memory is partitioned into three classes.

### Session Memory
Short-lived conversation state needed to continue the current interaction.

Properties:
- bounded
- disposable
- channel-aware
- not automatically promoted to long-term memory

### Preference Memory
Explicit or high-confidence user preferences/rules.

Examples:
- preferred planning style
- preferred work hours
- preferred reminder behavior

Properties:
- user visible
- editable
- deletable
- change/audit history when useful

### Useful Long-Term Memory
Stable facts that materially improve MiD assistance.

Promotion must be deliberate. “The user said it once” is not enough.

Every stored memory needs:
- owner
- type
- content/value
- source
- createdAt/updatedAt
- optional confidence
- optional expiresAt
- deletion capability

AI memory must never become the source of truth for core domain state.

## 11. Multimodal Input

Normalize all input into a common request envelope.

Supported types:
- text
- image
- voice

Examples:
- receipt image
- screenshot of an assignment/task
- voice planning request
- Telegram/WhatsApp conversational input

External content is untrusted. OCR, vision, transcription, and extracted text are evidence for interpretation, not privileged instructions.

## 12. Receipt Intelligence

Required flow:

Image
-> OCR/Vision extraction
-> structured candidate
-> validation/normalization
-> user review
-> explicit confirmation
-> MiD transaction write

The extracted amount, date, merchant, category, and line items remain untrusted until confirmation.

Never create a financial transaction directly from a model extraction without the required approval state.

## 13. Planning

Planning input should be built from:
- current schedule
- relevant tasks
- goals
- available time
- user preferences
- explicit constraints

Planning output should be one of:
- recommendation
- explanation
- draft plan
- proposed changes awaiting confirmation

The planner must not silently:
- reschedule events
- delete tasks
- alter goals
- create transactions
- change notification rules

For proposed changes, return a structured diff so the UI/channel can explain exactly what will change before confirmation.

## 14. Proactive Intelligence

User-controlled levels:

`Off -> Suggestions -> Active Assistant -> Automation`

Default:
- no autonomous mutation
- no hidden background execution
- bounded suggestion frequency
- respect quiet hours/preferences
- every automation rule is explicit, reviewable, and revocable

Automation should be event-driven and idempotent rather than model-driven polling loops.

## 15. Prompt Injection Defense

Treat all external/user-controlled content as untrusted data:
- emails
- documents
- webpages
- uploaded files
- OCR text
- imported messages
- task descriptions

Security boundary:
- system/developer policy is immutable to model-visible content
- external content is wrapped/tagged as data
- tool permissions are server-side
- secrets are never placed in model context
- retrieved text cannot authorize itself
- suspicious instruction-like content should be treated as content, not policy

## 16. Failure Behavior

AI failures must degrade safely.

Cases:
- provider timeout -> return a deterministic fallback/error state
- provider unavailable -> core feature remains usable
- invalid model output -> reject and retry only within bounded policy
- invalid tool args -> do not execute; request correction or return safe error
- authorization denied -> do not reveal protected data; return permission-safe response
- tool partial failure -> do not claim success
- duplicate/retry risk -> enforce idempotency key where relevant

Never fabricate a result to hide an AI or tool failure.

## 17. Cost and Latency Controls

Free-tier-first policy:

- classify requests before expensive inference when practical
- route simple tasks to cheaper/smaller models
- reserve multimodal/high-capability models for use cases that require them
- cap context size
- cap output tokens
- enforce per-user and per-request budgets
- log provider/model/token usage
- set hard timeouts
- avoid recursive agent loops
- prefer deterministic application logic over LLM reasoning when a rule can be implemented in code

Cost controls must be observable without storing sensitive prompt content unnecessarily.

## 18. Observability and Audit

Track metadata such as:
- request ID
- user ID
- channel
- use case
- model/provider
- latency
- token/cost estimate
- selected tools
- tool success/failure
- action level
- approval state
- error category

For sensitive actions, retain auditable metadata but avoid unnecessary raw sensitive content.

## 19. Evaluation

Evaluation is a release gate, not an optional benchmark.

Minimum suites:
- intent classification
- context relevance/minimization
- tool selection
- tool argument validity
- authorization boundary
- prompt injection resistance
- receipt extraction
- planning consistency
- hallucination/non-fabrication
- provider fallback
- cost
- latency
- idempotency/retry behavior

A model upgrade must be evaluated against representative MiD cases before it becomes the default route.

## 20. Implementation Order

1. AI contracts and schemas
2. Gateway/provider adapter
3. Context builder interfaces
4. Permission evaluator
5. Tool registry + validation boundary
6. AI action/approval state machine
7. Session/preference memory
8. Multimodal normalization
9. Receipt pipeline
10. Planning
11. Proactive/automation layer
12. Evaluation harness and regression suite

The first executable vertical slice should target:
- natural-language task input
- schedule/task reads
- draft task creation
- explicit confirmation
- one provider through the gateway
- deterministic fallback when AI is unavailable
