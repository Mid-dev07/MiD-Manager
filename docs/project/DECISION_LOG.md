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
