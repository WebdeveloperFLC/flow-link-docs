# CMS Phase 2C — Deploy (Approvals queue UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/admin/approvals` | CMS table queue — Request, Item, Amount, Stage, Risk, Age |
| Stage strip | Auto / Manager / Director / Multi-level filters with counts |
| Unified queue | Discount approvals + wallet exception requests |
| Director | Read-only table (no action column) — PH-R-006 preserved |
| Logic | `approvalQueueLogic.ts` + unit tests |

**No migration.**

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| `ph.director@` | `/performance/admin/approvals` | Table rows visible, **no** Approve/Reject |
| `ph.manager@` or `ph.admin@` | Same | Action buttons + stage filter works |
| Demo data | June 2026 | 3 PH demo discount rows in queue |

---

*Next: Phase 2D — Promotion requests UI (`09_Promotion_Requests.png`)*
