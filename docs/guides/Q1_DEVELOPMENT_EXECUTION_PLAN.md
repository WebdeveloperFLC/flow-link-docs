# Q1 Development Execution Plan

**Package:** Q1 Sprint Planning Package v1.2 (approved)  
**Branch target:** `main` → `feature/service-library-nav`  
**Scope:** Foundation only — no Q2, no commission integration, no payments

---

## 1. Objective

Deliver the qualification operational anchor: schema (M1a–M1f), RPCs, Qualification tab UI, lifecycle (8 states including ON_HOLD), owner assignment, application status placeholder, event audit, external-event stub.

---

## 2. Deliverables checklist

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | M1a — `deposit`, `semester_3` commission period codes | Done |
| 2 | M1b — qual anchor + deposit/tuition tracks + funding plans | Done |
| 3 | M1c — events + adjustment scaffold + external events scaffold | Done |
| 4 | M1f — RLS + indexes | Done |
| 5 | RPC — `fn_upsert_client_qualification` | Done |
| 6 | RPC — `fn_transition_qualification_status` | Done |
| 7 | RPC — `fn_reassign_qualification_owner` | Done |
| 8 | RPC — `fn_update_application_status` | Done |
| 9 | RPC — `fn_qualification_ingest_event` | Done |
| 10 | RPC — `fn_ingest_external_event` (stub) | Done |
| 11 | RPC — `fn_upsert_qualification_funding_plan` | Done |
| 12 | UI — Qualification tab on Client Detail | Done |
| 13 | UI — Lifecycle badge + transitions | Done |
| 14 | UI — Owner + application status | Done |
| 15 | UI — Operational deposit/tuition summary (A2) | Done |
| 16 | UI — Funding plan stub | Done |
| 17 | UI — Event timeline | Done |
| 18 | Tests — lifecycle + non-goals + tab nav | Done |

**Deferred (Q2):** policy templates, A1 commission period mapping.

---

## 3. Migration publish order

1. `20260901120000_qual_q1_foundation.sql`
2. `20260901120100_qual_q1_rls_rpcs.sql`

**Lovable:** Publish both in one session; approve migrations when prompted.

---

## 4. Implementation sequence (executed)

```
Day 1–2   Migrations M1a–M1c + enums + core tables
Day 2–3   M1f RLS + all Q1 RPCs
Day 3–4   lib/qualification + hooks
Day 4–5   Qualification tab UI components
Day 5     Wire ClientDetail tab + unit tests
Day 6     Internal UAT Q1-INT-01…16 on staging
```

---

## 5. Commission non-goals (verified)

Q1 code must **not**:

- Create or modify `upi_commission_students`
- Call `fn_evaluate_eligibility` / `fn_mark_student_eligible`
- Create snapshots or modify claim cycles / commission invoices
- Import `fetchStudentFinancialSummary` in Qual UI

Enforced by: `src/lib/qualification/nonGoals.test.ts` + code review.

---

## 6. Internal UAT (post-publish)

| ID | Scenario |
|----|----------|
| Q1-INT-01 | Open Qualification tab |
| Q1-INT-02 | Create qualification (Draft, owner set) |
| Q1-INT-03 | Summary shows no AR/trust/GL |
| Q1-INT-04 | SFL cross-link works |
| Q1-INT-05 | Funding plan stub |
| Q1-INT-06 | Event timeline |
| Q1-INT-07 | View-only permissions |
| Q1-INT-08 | Commission Mark Eligible unchanged |
| Q1-INT-11 | Draft → Active |
| Q1-INT-12 | Active → Refused |
| Q1-INT-13 | Active → On Hold (amber badge) |
| Q1-INT-14 | On Hold → Active |
| Q1-INT-15 | Reassign owner |
| Q1-INT-16 | Application status change; lifecycle unchanged |

**Owner:** Balveer + Engineering

---

## 7. Regression gates (CI)

- `npm run test` — includes lifecycle + nonGoals + ClientDetailTabNav
- Phase 1 commission tests (unchanged)
- Phase 2A/2B tests (unchanged)

---

## 8. Known limitations (Q1 by design)

- No payment recording (Q4A)
- No schedule/milestones (Q2–Q3)
- No policy templates or A1 mapping (Q2)
- External events: stub insert only; no webhook endpoint
- Transfer transition requires manual institution UUID (case picker in Q2)
- Track paid amounts remain 0 until Q4A verify flow

---

## 9. Next phase gate

**Q2 kickoff** after Q1 internal UAT sign-off. Do not start Q2 migrations until Q1-INT checklist passes.

---

*Generated at Q1 implementation start — v1.2 scope.*
