# CMS Phase 2J — Deploy (Offer codes UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/offers/codes` | Unified offer code management |
| Prototype ref | `04_Screenshots/08_Offer_Codes.png` |
| Data | `offers.promo_code` + `offer_tracking_codes` + `offer_events` usage |
| KPIs | Active codes, redemptions, one-time, bulk pool cap |
| Table | Code, offer, type, scope, branch, redemption meter, status |
| Panels | Constraints reference + redemption performance bars |
| Generate | Counselor tracking codes via existing RPC |
| Nav | Offers studio → Codes |

**No migration.**

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| MarCom / admin | `/performance/offers/codes` | KPI strip + unified code table |
| Demo offers | Same | Promo codes from PH demo offers visible |
| Generate | Pick offer + counselor | New row in table (idempotent RPC) |
| Filter chips | Active / Counselor | Rows filter correctly |

---

*Next: Phase 2K — Revenue analytics UI (`03_Revenue_Analytics.png`) or Phase 3 additive schema.*
