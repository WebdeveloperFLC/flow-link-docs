# CMS Phase 2S — Deploy (Approvals CMS UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/approvals` | Approvals & governance CMS workspace |
| Prototype ref | `04_Screenshots/15_Approvals.png` |
| KPI strip | Pending, high risk, manager queue, oldest waiting |
| Stage strip | Auto → manager → director → multi-level |
| Queue table | Discount + wallet exception approvals |
| Depth matrix | Counselor / manager / admin routing rules |
| Shared hook | `useApprovalQueueData` — load + approve/decline |
| Admin floors | Remain at `/performance/admin/approvals#floor-policy` |

**No migration.**

## Guardrail (PH-R-020)

Runs automatically when shipping Performance Hub pages/components.

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| Manager / admin | `/performance/approvals` | KPI strip + stage filter + queue table |
| Director | `/performance/approvals` | Rows visible, read-only (no approve/decline) |
| Admin | Margin floors link | `/performance/admin/approvals#floor-policy` |
| Nav | Performance Hub | Approvals |

---

*Next: Audit trail CMS (`18_Audit_Trail.png`) or report builder (`16`).*
