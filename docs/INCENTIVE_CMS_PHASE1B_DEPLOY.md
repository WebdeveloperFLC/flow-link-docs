# CMS Phase 1B — Deploy (remaining PH-R fixes)

## Shipped (agent)

| ID | Fix |
|----|-----|
| PH-R-001 | Shared `isPersonalWalletBudgetKind()` + regression test |
| PH-R-004 | Dashboard “Active Offers” → `/performance/offers/library` |
| PH-R-005 | `/incentives/give-discount` redirects to `/performance/give-discount` |
| PH-R-008 | Command center page guard — admin only |
| PH-R-009 | `/incentives/*` routes use Performance Hub theme shell |
| QA | `qa/regression/PH-R-001.test.ts`, `PH-R-009.test.ts` — `npm run test:regression` |

**No new migration.**

Phase 1 stabilization complete (PH-R-006/007 verified live; director approvals confirmed).

---

## YOUR ACTION

### Step 1 — Lovable → Sync from GitHub → Publish

No migration in this ship. UI-only.

### Step 2 — Smoke check (optional, 2 min)

| Login | Route | Expect |
|-------|-------|--------|
| `ph.counselor1@` | `/performance/executive` | Wallet unlocked KPI ≠ ₹0 |
| `ph.admin@` | `/performance/admin` | Command center loads |
| Counselor (non-admin) | `/performance/admin` | Redirect to `/performance` |
| Any | `/incentives/plans` | Hub navy context bar visible |

No SQL required.

---

*Next agent phase: CMS Phase 2 UI modernization per `FLC_CMS_Cursor_Package` screenshots.*
