# SSOT — Single Source of Truth

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active |
| **Rule** | REUSE → EXTEND → CREATE |

---

## Decision order

```
REUSE existing artifact
    ↓ cannot satisfy requirement
EXTEND existing artifact (column, JSONB key, RPC param, UI field)
    ↓ cannot satisfy requirement
CREATE new artifact (with architect awareness)
```

---

## HR Payroll examples

| Business fact | SSOT | Wrong approach |
|---------------|------|----------------|
| Personal email | `employees.email` | Duplicate column `personal_email` |
| Personal mobile | `employees.mobile` | Storing only in CRM profile |
| Emergency contact | `employees.emergency_contacts[0]` JSONB | Separate table for first contact only |
| Official vs communication email | `company_email` + `official_communication_email` | Overloading one field for both purposes |
| Training extension | Same `training_records` row + `training_extension_history` | New training row per extension |
| Role assignment | `fn_assign_hr_role` + `hr_role_assignments` | Ad-hoc profile flags |
| Approval decision | `fn_process_approval_decision` / domain RPCs | Client-only status updates |

---

## UI SSOT

- **Employee Master** owns editable employee fields.
- **ESS** reads official/preference fields; edits only employee-owned contact per RPC.
- **Export** reuses `buildPersonalContactExport` / `buildOfficialContactExport` — not ad-hoc column lists.

---

## Verification question

Before adding anything new, ask: *“Which existing table, column, or function already owns this fact?”*
