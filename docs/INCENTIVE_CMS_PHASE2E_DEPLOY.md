# CMS Phase 2E — Deploy (Executive command center UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/executive` | CMS executive command center layout |
| Prototype ref | `04_Screenshots/01_Dashboard_Executive.png` |
| KPIs | Revenue, net margin, wallet unlocked, pending approvals |
| Charts | Branch attainment bars + service-line mix (RPC data) |
| Panels | Branch/counselor leaderboards + approvals preview |
| E2E | `kpi-revenue`, `kpi-wallet-unlocked` preserved |

**No migration.**

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| `ph.admin@` or `ph.director@` | `/performance/executive` | 4 KPI cards + branch chart + approvals panel |
| Demo · June 2026 | Same | Wallet unlocked ≠ ₹0; approvals preview shows PH demo rows |

---

*Next: Phase 2F — Branch manager dashboard (`02c_Dashboard_Branch.png`)*
