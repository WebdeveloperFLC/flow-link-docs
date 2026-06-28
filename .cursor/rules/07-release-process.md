---
description: GitHub + Lovable release process
alwaysApply: true
---

# Release Process

## Standard path (code changes)

1. Implement on `main` with passing build/tests.
2. `npm run ship -- "<message>" -- <paths>` → pushes `main` + mirrors `feature/service-library-nav`.
3. Owner: **Lovable → Sync from GitHub → Publish** → approve **all** pending migrations (see checklist).
4. Hard refresh (Cmd+Shift+R).

## Documentation-only commits

- Commit to `main` locally or via explicit docs commit.
- **No shipment required** when architect specifies docs-only delivery.

## Migration publish

- `npm run ship` does **not** run SQL on Supabase.
- SQL applies only via Lovable Publish.
- Verify: `git fetch origin && git rev-parse HEAD origin/main origin/feature/service-library-nav`

## PRs

- Default: direct push to `main`.
- PR only when user or architect requests review branch.

Reference: `docs/engineering/05-Build-Release-Gates.md`, `docs/LOVABLE_PUBLISH_CHECKLIST.md`, `.cursor/rules/auto-ship.mdc`.
