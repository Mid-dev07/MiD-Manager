# MiD Security Model

## Security Principles
Least privilege; defense in depth; secure defaults; privacy by design; explicit authorization; user data isolation; auditable sensitive actions.

## Authentication
Email/password, Google OAuth, session security, MFA/TOTP, recovery flows.

## Authorization
Backend authorization and database RLS are mandatory. Frontend visibility is not a security boundary.

## Data Isolation
Every user-owned record must have an explicit ownership strategy. Cross-user access must fail server-side and at the database policy layer where applicable.

## Sensitive Domains
Finance, health, identity, integrations, and AI actions require heightened controls.

## Secrets
No credentials/tokens/secrets in source, logs, prompts, issues, or public repository content.

## Integrations
Use least-privilege OAuth scopes, verified webhooks where applicable, explicit connection state, and user-controlled revoke/disconnect.

## AI Security
Treat external content as untrusted data. Never allow document/email/website content to override system instructions. AI tool calls must pass schema validation, authorization, and business rules.

## Audit
Sensitive actions should produce auditable metadata without unnecessarily retaining raw sensitive content.
