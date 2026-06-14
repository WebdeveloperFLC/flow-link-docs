# CMS Phase 3D — Deploy (CRM auto-inheritance policy)

## Shipped (agent)

| Item | Change |
|------|--------|
| Migration | `20260718120003_incentive_cms_phase3d_autoapply_policy.sql` |
| Table | `commercial_autoapply_policy` (5 entity types seeded) |
| RPC | `fn_crm_integration_health` — entity counts + sync checks |
| `/performance/crm-integration` | CRM integration workspace |
| Prototype ref | `04_Screenshots/20_CRM_Integration.png` |
| UI | Entity grid, auto-apply policy selectors, health panel |

**Requires migration approval in Lovable Publish.**

---

## YOUR ACTION

### 1. Lovable → Sync from GitHub → Publish

Approve migration:

```
20260718120003_incentive_cms_phase3d_autoapply_policy.sql
```

### 2. Verify (optional)

| Step | Expect |
|------|--------|
| Admin → `/performance/crm-integration` | CRM banner + entity count cards |
| Auto-apply panel | 5 entity types with policy dropdowns |
| Manager edit | Change policy → saves to `commercial_autoapply_policy` |
| SQL | `SELECT fn_crm_integration_health();` returns entity counts |

---

*Next: Phase 2N / CMS UI — Incentive plans workspace (`11_Incentive_Plans.png`) or incentive threshold columns (§5.5).*
