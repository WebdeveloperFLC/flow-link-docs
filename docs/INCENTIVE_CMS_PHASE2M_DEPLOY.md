# CMS Phase 2M — Deploy (Client commercials UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/client-commercials` | CRM-linked client commercial records workspace |
| Prototype ref | `04_Screenshots/10_Client_Commercials.png` |
| Table | Client, lead, service, stage, original/discount/final/paid |
| Detail modal | Price breakdown, lock banner, eligibility chips |
| CRM banner | Records inherited from CRM — no duplicate data |
| Actions | Links to client profile for apply/update discount |
| Data | `client_invoices`, `wallet_allocations`, `clients`, `offers` |

**No migration.**

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| Admin / counselor | `/performance/client-commercials` | CRM banner + commercial records table |
| Filter chips | Quote / Invoice draft / Paid | Rows filter by invoice stage |
| Row click | Detail modal | Price breakdown + link to client profile |
| Locked row | Partial or full paid | Lock banner + “Open client profile” |

---

*Next: Phase 3 additive schema (combinations, eligibility, profitability) or Incentive plans UI (`11`).*
