# CMS Phase 2R — Deploy (Multi-currency CMS UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/multi-currency` | Multi-currency CMS workspace |
| Prototype ref | `04_Screenshots/14_Multi_Currency.png` |
| KPI strip | Live currencies, CAD→INR, period revenue, base INR |
| Table | Currency config with rate, revenue orig/INR, status |
| Panels | Revenue mix donut + CAD→INR history bars |
| Data | `fx_rates`, `client_invoices` |
| Operations link | Rate override remains at `/incentives/fx-rates` |

**No migration.**

## Guardrail (PH-R-020)

| Item | Change |
|------|--------|
| `qa/regression/PH-R-020-performance-hub-imports.test.ts` | Imports every Performance Hub module — catches missing icon imports before ship |
| `npm run typecheck` | `tsc --noEmit` — optional gate |
| `scripts/ship.sh` | Runs PH-R-020 when shipping `src/components/performance/` or `src/pages/Performance*` files |

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| Admin / director | `/performance/multi-currency` | Currency table + mix + history |
| Link | `/incentives/fx-rates` | Add/override CAD rate |
| Nav | Performance Hub | Multi-currency |

---

*Next: Approvals CMS (`15_Approvals.png`) or audit trail (`18`).*
