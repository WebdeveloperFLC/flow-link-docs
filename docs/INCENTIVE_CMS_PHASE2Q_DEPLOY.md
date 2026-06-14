# CMS Phase 2Q — Deploy (Commission tracking CMS UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/commissions` | Commission management CMS workspace |
| Prototype ref | `04_Screenshots/13_Commission_Tracking.png` |
| KPI strip | Received, pending, reversed, forecast (INR consolidated) |
| Ledger table | Per-institution partner rows with original currency + INR column |
| Data | `upi_commission_students`, `upi_institutions`, `upi_commissions`, `fx_rates` |
| Operations link | Claim cycles / invoices remain at `/commissions` |

**No migration.**

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| Admin / director | `/performance/commissions` | KPI strip + commission ledger table |
| FX | Same page | INR column uses period `fx_rates` (CAD fallback 61.7) |
| Full module | `/commissions` | Claim cycles + invoice workflow |
| Nav | Performance Hub | Commissions |

---

*Next: Multi-currency CMS (`14`), approvals queue (`15`), or audit trail (`18`).*
