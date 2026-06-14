# CMS Phase 2D — Deploy (Promotion requests UI)

## Shipped (agent)

| Item | Change |
|------|-----|
| `/performance/offers/requests` | CMS workflow strip + proposal cards |
| Prototype ref | `04_Screenshots/09_Promotion_Requests.png` |
| Metrics | Budget / forecast / ROI derived from proposal text (no schema change) |
| Workflow | Submitted → Manager → Director (≥8× ROI) → Launched |
| MarCom | `canEditOffers` review actions preserved (PH-R-007) |

**No migration.**

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| `ph.counselor1@` | `/performance/offers/requests` | Submit proposal form + demo cards |
| `ph.marcom@` (or admin) | Same | Approve / Reject / Publish on pending rows |
| Workflow strip | Click filters | Cards filter by stage |

---

*Next: Phase 2E — Executive dashboard UI (`01_Dashboard_Executive.png`)*
