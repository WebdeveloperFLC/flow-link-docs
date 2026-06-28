# Ownership Principle

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active |
| **Related** | [docs/governance/OWNERSHIP_MATRIX.md](../governance/OWNERSHIP_MATRIX.md) |

---

## Module ownership

| Module | Owns | Does not own |
|--------|------|--------------|
| **HR Payroll** | Employees, attendance, WTM, training, HR approvals, payroll cycles (HR view) | CRM leads/clients, accounting GL |
| **CRM** | Leads, clients, services, staff identity | Employee salary structure, payroll computation |
| **Accounting** | Chart of accounts, journals, trust, AR | HR employee master |
| **Performance Hub** | Incentives, offers, promotions | HR payroll engine |
| **WPMS / WRE / WTM** | Policy bundles, session evaluation, punch sessions | Ad-hoc payroll formula changes |

---

## Data ownership examples

| Data | Owner | Readers |
|------|-------|---------|
| Personal contact | Employee (via ESS) + HR Master | ESS (read official), reports |
| Official contact | HR / organization | ESS (read-only) |
| CRM `staff_id` link | HR Employee Master | ESS auth, team panel |
| Training record | HR Training workflow | Approvals, payroll unpaid days |
| Migration SQL | GitHub `main` → Lovable Publish | Supabase (via Lovable only) |

---

## Cross-module changes

When a change touches two modules:

1. Identify **primary owner** module.
2. Extend owner's SSOT; expose read/link APIs to consumers.
3. Do not duplicate state in the consumer module.

---

## Agent rule

If unsure who owns a field or workflow, **stop** and classify — do not create parallel storage.
