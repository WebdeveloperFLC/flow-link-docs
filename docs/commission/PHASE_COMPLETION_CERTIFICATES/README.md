# Phase Completion Certificates — Commission Module Phase 3

Permanent record of phase gate outcomes. One file per feature (F3.4 → F3.3 → F3.1 → F3.2).

| Certificate | Phase feature | Status |
|---------------|---------------|--------|
| [F3.4_COMPLETION.md](./F3.4_COMPLETION.md) | RLS remediation | **IN PROGRESS** — SQL approved; UI UAT pending |
| [F3.3_COMPLETION.md](./F3.3_COMPLETION.md) | Append-only audit log | NOT STARTED |
| [F3.1_COMPLETION.md](./F3.1_COMPLETION.md) | Financial-event publishing | NOT STARTED |
| [F3.2_COMPLETION.md](./F3.2_COMPLETION.md) | Adjustments / credit / debit notes | NOT STARTED |

## Certificate fields (standard)

Each certificate documents:

- Phase ID and description  
- Git commit at close  
- Migration IDs  
- Verification status (SQL + automated)  
- UAT status (manual + UI smoke)  
- Regression status  
- Outstanding issues  
- Approval date and approver  
- Next phase  

## Governance

- Do **not** mark a certificate **COMPLETE** until all gates in the Implementation Bible §12 acceptance criteria are green.  
- Conflicts → discrepancy report / RFC; do not edit frozen architecture docs.
