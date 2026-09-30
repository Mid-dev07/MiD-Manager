# Contributing to MiD Manager

## Core Rule
All changes must preserve product requirements, architecture boundaries, security, usability, accessibility, performance, and free-tier constraints.

## Development Flow
1. Read relevant docs before changing code.
2. Work in an isolated feature branch/worktree.
3. Define acceptance criteria before implementation.
4. Implement the smallest correct change.
5. Run relevant tests and checks.
6. Update project state and decision records.
7. Submit for appropriate review.
8. Do not merge unresolved critical/high-risk findings.

## Multi-Agent Rule
Agents may work in parallel only when dependencies and write ownership are clear. Conflicting writes must be coordinated by the Orchestrator.

## Secrets
Never commit credentials, tokens, passwords, OAuth secrets, or production secrets.
