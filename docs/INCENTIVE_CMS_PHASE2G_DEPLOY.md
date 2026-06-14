# CMS Phase 2G — Deploy (Finance & revenue control UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/finance` | Finance workspace — CMS layout |
| Prototype ref | `04_Screenshots/02b_Dashboard_Finance.png` |
| KPIs | Net revenue, discount given, effective discount %, cash incentive due |
| Charts | Branch attainment + service mix (existing RPCs) |
| Workflow | Finance quick actions + alerts (run lock, payouts, approvals) |
| Nav | Performance Hub sidebar + command center link |

**No migration.**

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| `ph.admin@` | `/performance/finance` | 4 finance KPI cards + branch chart + payout quick actions |
| Demo · June 2026 | Same | Discount given reflects wallet allocations; alerts if run unlocked |
| Quick actions | Payout desk / FX / unclassified | Navigate correctly |

---

*Next: Phase 2H — Offer management UI (`07_Offer_Management.png`) or mobile dashboards (`28`/`29`).*
