# CMS Phase 3A — Deploy (Combination engine)

## Shipped (agent)

| Item | Change |
|------|--------|
| Migration | `20260718120000_incentive_cms_phase3a_combination_engine.sql` |
| Table | `service_combinations` (logical + package modes) |
| RPC | `fn_resolve_combination`, `fn_service_code_consultancy_inr` |
| `/performance/combinations` | Combination engine CMS workspace |
| Prototype ref | `04_Screenshots/06_Combination_Engine.png` |
| UI | Card grid, D/O/I rule tags, detail modal, create logical combo |

**Requires migration approval in Lovable Publish.**

---

## YOUR ACTION

### 1. Lovable → Sync from GitHub → Publish

Approve migration:

```
20260718120000_incentive_cms_phase3a_combination_engine.sql
```

### 2. Verify (optional)

| Step | Expect |
|------|--------|
| Admin → `/performance/combinations` | Banner + KPI strip + empty state or cards |
| Create combo | Name + service library UUID codes → card appears |
| Card click | Detail modal with price + rule tags |
| SQL | `SELECT fn_resolve_combination('<combo-id>');` returns JSON price + rules |

### 3. Create a test combination (optional)

After migration, as admin/manager on `/performance/combinations`:

1. **New combination**
2. Name: `Coaching + Visa`
3. Service codes: paste two `service_library` IDs from CRM (comma-separated)
4. Max discount: `12`

---

*Next: Phase 3B — offer eligibility rules (`offer_eligibility_rules`) or Incentive plans CMS UI (`11`).*
