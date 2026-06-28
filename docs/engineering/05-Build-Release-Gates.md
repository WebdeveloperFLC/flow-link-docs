# Build & Release Gates

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active |

---

## Gate sequence (code changes)

| Step | Command | Pass criteria |
|------|---------|---------------|
| 1 | `npx tsc --noEmit` | Exit 0 |
| 2 | `npm run build` | Exit 0 |
| 3 | Module tests | e.g. `npm test -- qa/hr-payroll` — 0 failures |

On failure: **STOP**, fix first error, repeat.

---

## Ship gate

| Condition | Ship? |
|-----------|-------|
| Build + tests pass + architect approved | Yes (`npm run ship`) |
| Docs-only commit (explicit) | Commit only; ship optional |
| Build or tests failing | **No** |
| User says do not ship | **No** |

---

## Post-ship (owner)

1. Lovable → **Sync from GitHub**
2. Lovable → **Publish** → approve all pending migrations
3. Hard refresh

See [LOVABLE_PUBLISH_CHECKLIST.md](../LOVABLE_PUBLISH_CHECKLIST.md).

---

## Verify GitHub

```bash
git fetch origin
git rev-parse HEAD origin/main origin/feature/service-library-nav
```

`main` and `feature/service-library-nav` should match after routine ship.

---

## Release process summary

Documented in `.cursor/rules/07-release-process.md` and [06-UAT-Governance.md](./06-UAT-Governance.md).
