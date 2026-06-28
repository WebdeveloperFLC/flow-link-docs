# Architecture Review

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active |
| **Authority** | ERP Solution Architect |

---

## When review is required

- New module or cross-module integration
- New authorization / RBAC model
- Payroll engine, leave engine, or accounting posting changes
- New global helper functions (especially auth)
- UAT items marked rejected that are re-proposed as “quick fixes”
- Splitting or merging migration tracks

---

## When review is not required

- Approved P1/P2/P3 UAT defects within existing patterns
- SSOT extend-only changes (columns, JSONB keys)
- Bug fixes reusing existing RPCs and RLS
- Documentation-only commits

---

## Review inputs

1. Change Request Classification
2. SSOT impact (REUSE / EXTEND / CREATE)
3. Migration list + **Migration Dependency Verification**
4. **Existing Functions Reused**
5. Regression areas affected
6. Build + test evidence

---

## Review outputs

| Outcome | Next step |
|---------|-----------|
| **Approved for implementation** | Implement + build gates |
| **Approved for shipment** | `npm run ship` + Lovable Publish |
| **Approved with conditions** | Address conditions first |
| **Rejected** | Do not implement; document in backlog |

---

## Architecture boundaries (HR — locked unless approved)

| Boundary | Rule |
|----------|------|
| Payroll computation | No `fn_compute_payroll` changes |
| Leave management | No new leave engine scope |
| Accounting | No accounting module changes |
| WTM / WRE | Extend evaluation only; preserve session engine |
| Contact vs UAT tracks | Independent migrations |

---

## Related documents

- [01-Engineering-Standards.md](./01-Engineering-Standards.md)
- [04-Migration-Review-Checklist.md](./04-Migration-Review-Checklist.md)
- [docs/SYSTEM_ARCHITECTURE.md](../SYSTEM_ARCHITECTURE.md)
