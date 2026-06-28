---
description: Build and test gates before ship
alwaysApply: true
---

# Build & Release Gates

## Before marking work complete

1. `npx tsc --noEmit`
2. `npm run build`
3. Module tests (e.g. `npm test -- qa/hr-payroll` for HR work)

## On failure

- **STOP** — report first error only, fix, repeat until clean.
- Do not ship with failing build or tests.

## Ship exception

Documentation-only commits (no code/SQL/UI): commit allowed without build; still run tests if any test files changed.

## UI / migration work

After code + migration ship: owner **Lovable → Sync → Publish → approve migrations → hard refresh**.

Reference: `docs/engineering/05-Build-Release-Gates.md`.
