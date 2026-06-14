# CMS Phase 2U — Deploy (Report Builder CMS UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/reports` | Report builder CMS workspace |
| Prototype ref | `04_Screenshots/16_Report_Builder.png` |
| Compose panel | Period (from bar), group by, metric toggles, build |
| Preview table | Dynamic columns from selected metrics |
| Export | CSV download |
| Data | `fn_commercial_profitability` RPC (Phase 3C migration) |
| Metrics | Revenue, discount, margin, wallet, commissions, incentives, enrollments (est.) |

**No new migration** — requires `20260718120002_incentive_cms_phase3c_commercial_profitability.sql` if not yet published.

## Guardrail (PH-R-020)

Runs automatically when shipping Performance Hub pages/components.

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only ship — ensure Phase **3C** migration is approved if preview table is empty.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| Admin / director | `/performance/reports` | Compose panel + preview table |
| Metrics | Toggle commissions / enrollments | Columns update |
| Export | Export button | CSV download |
| Nav | Performance Hub | Report builder |

---

*Next: Roles & permissions CMS (`19_Roles_Permissions.png`).*
