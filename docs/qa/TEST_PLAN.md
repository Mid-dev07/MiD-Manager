# MiD Test Plan Baseline

## Layers
- Unit tests
- Integration tests
- API tests
- End-to-end tests
- Manual QA
- Accessibility QA
- Visual QA
- Security review

## Required Paths
Happy path, invalid input, empty state, loading, error state, unauthorized access, cross-user access, retry, timeout, duplicate request, refresh/back navigation, responsive layouts.

## Critical Areas
Auth, MFA, authorization, user isolation, finance, health, AI actions, external integrations, deletion/export, database migrations.

## Definition of Done
Functional correctness, validation, authorization, responsive behavior, accessibility, performance, relevant automated tests, regression checks, and documentation.

## Gate
No final PASS while unresolved in-scope critical/high-risk defects remain. Insufficient evidence is NOT PASS.
