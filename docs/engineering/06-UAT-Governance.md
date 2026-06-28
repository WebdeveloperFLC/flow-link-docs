# UAT Governance

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active |
| **Related** | [docs/hr-payroll/HR_PAYROLL_UAT_KICKOFF.md](../hr-payroll/HR_PAYROLL_UAT_KICKOFF.md) |

---

## Triage classes

| Class | Definition | Default action |
|-------|------------|----------------|
| **P1 Bug** | Blocks core workflow; data wrong or lost | Fix in approved sprint |
| **P2 Bug** | Functional gap; workaround exists | Fix in approved sprint |
| **P3 Enhancement** | Improvement, not a defect | Fix only if sprint includes it |
| **Rejected** | Out of scope / redesign / new module | **Do not implement** |
| **Backlog** | Future phase | Document only |

---

## Sprint authorization

- ERP Solution Architect approves scope **before** implementation.
- Implement **only** listed items.
- Return: classification, files, migrations, build, tests, commit hash.
- Ship only after build/tests pass **and** architect ship authorization.

---

## Regression verification (HR)

After HR UAT sprints, verify:

- Employee Master · Employee360 · ESS · WTM · Attendance Exceptions
- Approval Center · Training · Reports · Estimated Payroll · Payroll Validation
- WPMS · Master Data · Roles & Permissions

Document any regression found; do not ship if regression exists.

---

## Defect analysis template

1. **Symptom** — what user saw
2. **Root cause** — code/SQL/process
3. **Fix** — minimal SSOT-preserving change
4. **Verification** — build, tests, manual step

---

## Rejected categories (HR example — do not implement without new approval)

- LWF Master redesign · TDS Master redesign
- Employee/Company Documents module redesign
- Late Request / Mispunch workflow redesign
- Attendance sequence change · Salary/Payroll redesign
- Leave Management new scope
