# HR Payroll — AI Auto-Test Guide

**Purpose:** Eliminate ~95% of bugs **before** human UAT. Human UAT runs only after this gate passes.

---

## Quick run

```bash
npm run test:hr-payroll
```

**Exit 0** = pre-UAT gate passed. **Exit 1** = fix failures before UAT.

---

## What the suite covers

| Suite | File | Checks |
|-------|------|--------|
| **Golden engine** | `qa/hr-payroll/engine-vectors.test.ts` | All **30 TV01–TV30** payroll vectors (Excel parity); **TV02** Isha anchor 29.5 / ₹39,500 |
| **Module contract** | `qa/hr-payroll/module-contract.test.ts` | Migrations 00–17, required RPCs, routes, pages, ESS `staff_id` link |
| **RBAC matrix** | `qa/hr-payroll/access-rbac.test.ts` | Employee vs Admin vs Manager default permissions |
| **Attendance** | `qa/hr-payroll/attendance-metrics.test.ts` | Late minutes, duration formatting |
| **Live DB** (optional) | `qa/hr-payroll/integration-smoke.test.ts` | Staging Supabase TV02 + employee count |

---

## Optional live DB smoke

Against your **staging** Supabase (after migrations 00–17). Use the **real** project URL from Lovable **Cloud → Database** — do **not** paste the `.env.example` placeholder into the shell (it overrides your real `.env`).

**Connectivity only** (uses anon key from `.env`):

```bash
HR_INTEGRATION_TEST=1 npm run test:hr-payroll
```

**Full TV02 + employee checks** (needs service role — Lovable **Cloud → Secrets**):

```bash
HR_INTEGRATION_TEST=1 \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... \
npm run test:hr-payroll
```

If you see `ENOTFOUND your_project.supabase.co`, you copied the guide example literally — remove the inline `VITE_SUPABASE_URL=...` lines and rely on `.env`.

---

## CI recommendation

Add to pipeline **before** deploy:

```yaml
- run: npm run test:hr-payroll
- run: npm run build
```

Block UAT sign-off until `test:hr-payroll` is green on staging branch.

---

## Changes from `docs/hr-payroll/changes - testing/`

Implemented in migration **17** + UI:

- First / last name on employee master
- Working days per week on shifts (1–7)
- Holiday applicability tags + 2026 India/Canada seed
- PF account checkbox, PT applicable, company currency fields
- Employee modal no longer closes on backdrop click
- ESS self-profile (migration 16)

**Deferred (Phase 2):** Full Canada EI/CPP/tax engine, strict production RLS (remove demo bootstrap), CRM company live sync.

---

## When human UAT is allowed

1. `npm run test:hr-payroll` → **PASS**
2. `npm run build` → **PASS**
3. Migrations **00–17** applied on staging
4. Optional: `HR_INTEGRATION_TEST=1` smoke on staging

Then run the 50-case pack in `docs/hr-payroll/HR_PAYROLL_UAT.md`.
