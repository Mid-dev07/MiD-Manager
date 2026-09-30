# MiD AI Architecture

## Principle
AI is an intelligence/orchestration layer, not the source of truth.

## Capabilities
Assistant, Planner, Insights, Receipt Intelligence, Automation, Multimodal Input.

## AI Flow
Intent -> Context Builder -> Permission Check -> AI Orchestrator -> Tool -> Validation -> Result.

## Action Policy
Default: read/suggest/draft. Changes require user confirmation unless the user explicitly enables the specific automation.

## Proactivity
Off -> Suggestions -> Active Assistant -> Automation.

## Context Minimization
Only relevant context may be passed to a model. Never provide the full user database by default.

## Memory
Session memory, user preferences, and useful long-term memory only. User must be able to inspect/edit/delete stored AI memory.

## Provider Abstraction
Model providers are behind an internal AI gateway to preserve portability and free-tier flexibility.

## AI Availability
Core MiD functionality must remain usable when AI is unavailable.
