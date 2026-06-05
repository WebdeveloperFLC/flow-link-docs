# Future Link CRM — Governance Index

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active |
| **Approved** | 2026-06-04 |

Master index for **infrastructure governance** documentation. These documents are separate from the technical [system-map/00-README.md](./system-map/00-README.md) (architecture and safety rules for developers).

**Organization:** Future Link Consultants  
**Maintainers:** OPS (operations lead), TECH (technical admin)

---

## Document registry

| Document | Version | Owner | Review frequency | Purpose |
| --- | --- | --- | --- | --- |
| [EXIT_STRATEGY.md](./EXIT_STRATEGY.md) | 1.0 | OPS + TECH | Quarterly | Continuity, ownership scorecard, Lovable dependencies, disaster recovery |
| [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) | 1.0 | TECH | Monthly | Day-to-day deploy, secrets, cron, integrations, troubleshooting |
| [ACCESS_REGISTER.md](./ACCESS_REGISTER.md) | 1.0 | OPS | Quarterly | Infrastructure access roles, system register, onboarding/offboarding |
| [OWNERSHIP_MATRIX.md](./OWNERSHIP_MATRIX.md) | 1.0 | OPS | Quarterly | Account owner, billing, data, RACI by asset |
| [MONTHLY_AUDIT.md](./MONTHLY_AUDIT.md) | 1.0 | OPS + TECH | Monthly | Governance checklist (security, cost, capacity, KPIs) |

---

## Governance status

Update **Last reviewed** and **Next review** when each document review completes (monthly audit log, quarterly ownership pass, etc.).

| Document | Current version | Last reviewed | Next review |
|---|---|---|---|
| [EXIT_STRATEGY.md](./EXIT_STRATEGY.md) | 1.0 | 2026-06-04 | 2026-09-04 |
| [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) | 1.0 | 2026-06-04 | 2026-07-04 |
| [ACCESS_REGISTER.md](./ACCESS_REGISTER.md) | 1.0 | 2026-06-04 | 2026-09-04 |
| [OWNERSHIP_MATRIX.md](./OWNERSHIP_MATRIX.md) | 1.0 | 2026-06-04 | 2026-09-04 |
| [MONTHLY_AUDIT.md](./MONTHLY_AUDIT.md) | 1.0 | 2026-06-04 | 2026-07-04 |

---

## Review cadence

```text
Weekly     → OPERATIONS_RUNBOOK § Health checks
Monthly    → MONTHLY_AUDIT (full pass) + OPERATIONS_RUNBOOK accuracy
Quarterly  → EXIT_STRATEGY, ACCESS_REGISTER, OWNERSHIP_MATRIX + offline secret inventory
On incident → OPERATIONS_RUNBOOK playbooks; DR per EXIT_STRATEGY if P1
```

| Role | Responsibility |
|---|---|
| **OPS** | Owns access register, ownership matrix, audit accountability, vendor billing review |
| **TECH** | Owns runbook, deploy paths, secrets rotation, integration health, supports audit |
| **OPS + TECH** | Joint: exit strategy, monthly audit, disaster recovery tabletop (annual) |

---

## Document relationships

```text
GOVERNANCE_INDEX (this file)
    ├── EXIT_STRATEGY      ← continuity & DR (when to migrate)
    ├── OWNERSHIP_MATRIX   ← who owns what
    ├── ACCESS_REGISTER    ← who can access what
    ├── OPERATIONS_RUNBOOK ← how to run production
    └── MONTHLY_AUDIT      ← prove controls are working
```

---

## Change control

Governance document template changes follow the same triggers as [MONTHLY_AUDIT.md § Change control](./MONTHLY_AUDIT.md#change-control):

- Security incident
- Compliance requirement
- Major architecture change
- New business KPI
- New critical integration

Increment the document **version** and add a row to that document's version history (where present). Update this index when registry versions change.

---

## Version history

| Version | Date | Status | Summary |
|---|---|---|---|
| 1.0 | 2026-06-04 | Active | Initial registry — five governance documents at v1.0 |
