# CMS Phase 2K — Deploy (Revenue analytics UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/analytics` | Revenue analytics workspace |
| Prototype ref | `04_Screenshots/03_Revenue_Analytics.png` |
| KPIs | Net revenue, discount given, effective discount %, net margin |
| Charts | 6-month qualifying revenue trend |
| Tables | Service-line revenue + event counts |
| Mix | Country revenue mix (dimension RPC) |
| Data | `fn_counselor_period_achievement`, `fn_incentive_dimension_leaderboard`, period metrics hook |

**No migration.**

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| Admin / director / manager | `/performance/analytics` | 4 KPI cards + trend bars + service table |
| Demo · June 2026 | Same | Non-zero trend for recent months if demo events exist |
| Branch filter | Period bar branch | Trend + KPIs scope to branch counselors |

---

*Next: Phase 2L — Comparison engine UI (`04_Comparison_Engine.png`) or Phase 3 additive schema.*
