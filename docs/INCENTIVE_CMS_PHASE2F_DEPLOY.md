# CMS Phase 2F — Deploy (Branch manager workspace UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/team` | Branch manager workspace — CMS layout |
| Prototype ref | `04_Screenshots/02c_Dashboard_Branch.png` |
| KPIs | Team revenue, avg achievement, wallet utilization, pending approvals |
| Charts | Counselor attainment bars + branch quick actions |
| Table | CMS counselor ranking with wallet/cash columns |
| Approvals | Preview panel linking to full queue |

**No migration.**

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| `ph.manager@` | `/performance/team` | Branch-scoped KPIs + counselor table |
| `ph.admin@` | Same | All branches view + link to executive |
| Quick actions | Branch pool / approvals links | Navigate correctly |

---

*Phase 2 UI modernization core screens complete (2A–2F). Next: Phase 3 additive schema or QA automation expansion.*
