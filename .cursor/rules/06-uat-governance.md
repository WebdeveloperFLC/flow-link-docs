---
description: UAT triage and architect approval governance
alwaysApply: true
---

# UAT Governance

## Classification (every UAT item)

| Class | Action |
|-------|--------|
| P1 Bug | Fix in approved sprint |
| P2 Bug | Fix in approved sprint |
| P3 Enhancement | Fix only if explicitly approved |
| Rejected / Backlog | **Do not implement** |

## Sprint rules

- Implement **only** architect-approved items for the sprint.
- No scope creep (redesigns, new modules, rejected workflows).
- Return deliverable: classification summary, files changed, build/test, commit hash.
- **Do not ship** until build + tests pass **and** architect authorizes (unless auto-ship rule applies for routine UI after approval).

## Regression verification

After HR changes, confirm no regression in: Employee Master, Employee360, ESS, WTM, Approvals, Training, Reports, Payroll Validation, WPMS, Roles.

Reference: `docs/engineering/06-UAT-Governance.md`, `docs/hr-payroll/HR_PAYROLL_UAT_KICKOFF.md`.
