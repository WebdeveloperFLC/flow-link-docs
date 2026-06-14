# CMS Phase 3C — Deploy (Commercial profitability)

## Shipped (agent)

| Item | Change |
|------|--------|
| Migration | `20260718120002_incentive_cms_phase3c_commercial_profitability.sql` |
| RPC | `fn_commercial_profitability(period, group_by, branch_id, limit)` |
| `/performance/profitability` | Profitability controls workspace |
| Prototype ref | `04_Screenshots/17_Profitability.png` |
| Dimensions | Counselor · Branch · Service · Country |
| KPI strip | Gross revenue, discount/wallet, incentives+commissions, net profit |

**Requires migration approval in Lovable Publish.**

---

## YOUR ACTION

### 1. Lovable → Sync from GitHub → Publish

Approve migration:

```
20260718120002_incentive_cms_phase3c_commercial_profitability.sql
```

(Also approve `20260718120000` / `20260718120001` if still pending.)

### 2. Verify (optional)

| Step | Expect |
|------|--------|
| Admin → `/performance/profitability` | KPI strip + dimension chips + matrix |
| By counselor | Rows with revenue, discount, incentive, margin % |
| Period bar | Changes period / branch filter |
| SQL | `SELECT * FROM fn_commercial_profitability('2026-06', 'counselor', NULL, 10);` |

---

*Next: Phase 3D — auto-inheritance policy (`commercial_autoapply_policy`) or Incentive plans CMS UI (`11`).*
