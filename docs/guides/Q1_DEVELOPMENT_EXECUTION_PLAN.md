# Q1 Development Execution Plan

**Package:** Q1 Sprint Planning Package v1.2 (approved) → **v1.2.2** (current)  
**Branch target:** `main` → `feature/service-library-nav`  
**Scope:** Foundation only — no Q2, no commission integration, no payments

> **Terminology (2026-06):** User-facing and frontend code use **Application** / **Student Application** / **Application ID**. Database tables, RPCs, and migration names retain `qualification_*` for compatibility (e.g. `client_institution_qualifications`, `fn_upsert_client_qualification`). Client detail tab route: `?tab=applications` (legacy `?tab=qualification` redirects).

---

## 1. Objective

Deliver the application operational anchor: schema (M1a–M1f), RPCs, **Applications** tab UI, lifecycle (8 states including ON_HOLD), owner assignment, admissions stage, event audit, external-event stub.

**Operational identity (Q1):** Client + Institution + Program + Intake + CRM Case — **no generated qualification reference number.**

**v1.2.2 scope change (approved):**

| Item | v1.2.1 | v1.2.2 |
|------|--------|--------|
| `qualification_number` | In scope | **Removed from Q1** |
| `fn_next_qualification_number` | In scope | **Removed** |
| Archival metadata | In scope | **Deferred to Q2 backlog** |
| `qualification_source` | In scope | **In scope (Q1)** |

---

## 2. Schema specification (v1.2.2)

### 2.1 Operational identity (no reference number)

Qualifications are identified and listed by:

| Field | Source |
|-------|--------|
| Client | `client_id` |
| CRM Case | `client_service_case_id` |
| Institution | `institution_id` |
| Program | `program_name` |
| Intake | `intake_term` (+ optional `intake_date`) |

UI list/selector uses this composite — not a system-generated code.

### 2.2 New enum: `qualification_source` (Q1)

| Value | Meaning | Q1 default |
|-------|---------|------------|
| `CRM_CASE` | Created from Client Detail Qual tab linked to service case | **Default** for UI create |
| `MANUAL` | Back-office manual entry | RPC-only in Q1 |
| `TRANSFER` | Spawned from transfer workflow | Set by RPC when applicable |
| `IMPORT` | Bulk import pipeline | RPC/admin only |
| `MIGRATION` | One-time backfill | Migration scripts only |

**Rule:** Audit/reporting only — does **not** drive lifecycle, eligibility, or payments.

### 2.3 Q1 column addendum

| Column | Type | Rules |
|--------|------|-------|
| `qualification_source` | `qualification_source NOT NULL DEFAULT 'CRM_CASE'` | Set on create; immutable after insert |

**Index:** `INDEX (qualification_source)` for reporting (optional, low cost).

### 2.4 Archival — Q2 backlog (not Q1)

**Deferred:** `is_archived`, `archived_at`, `archived_by`, `fn_archive_qualification`, `fn_unarchive_qualification`, archive UI, archive UAT.

**Technical dependency assessment:** **None for Q1.**

Existing unique index already scopes active rows by lifecycle:

```sql
UNIQUE (client_id, client_service_case_id, institution_id, intake_term)
WHERE status IN ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED')
```

- Terminal statuses (`CLOSED`, `CANCELLED`, `REFUSED`, `TRANSFERRED`) are **outside** the unique index → new qualification allowed after terminal transition.
- `COMPLETED → CLOSED` transition exists in Q1 to release the slot when intake is reused.
- Archival was a UX/history concern, not a Q1 blocker.

**Q2 backlog note:** Add archival when list hygiene and “hide without terminal transition” is required; revisit unique index with `is_archived = false` at that time.

### 2.5 Removed from Q1 (v1.2.2)

- `qualification_number` column
- `fn_next_qualification_number`
- Number sequence table/function
- All number-related UI, tests, UAT

---

## 3. Migration publish order (v1.2.2)

| Order | File | Purpose |
|-------|------|---------|
| 1 | `20260901120000_qual_q1_foundation.sql` | M1a–M1c: enums, anchor, tracks, events |
| 2 | `20260901120100_qual_q1_rls_rpcs.sql` | M1f RLS + all Q1 RPCs |
| 3 | **`20260901120200_qual_q1_qualification_source.sql`** | **v1.2.2 only:** `qualification_source` enum + column + upsert RPC patch |

**Removed migration content (vs v1.2.1):** number sequence, archival columns, archive RPCs, unique-index archival fix.

**Lovable:** Publish all three in one session; approve migrations when prompted.

---

## 4. TypeScript types (v1.2.2)

**Add:**

```typescript
export const QUALIFICATION_SOURCES = [
  "CRM_CASE", "MANUAL", "TRANSFER", "IMPORT", "MIGRATION",
] as const;
export type QualificationSource = (typeof QUALIFICATION_SOURCES)[number];

// QualificationRecord:
qualificationSource: QualificationSource;
```

**Do not add:** `qualificationNumber`, archival fields (Q2).

**Files:** `types.ts`, `constants.ts` (labels), `qualificationApi.ts` (map column).

---

## 5. RPC specification (v1.2.2)

### Patch (migration 3)

| RPC | Change |
|-----|--------|
| **`fn_upsert_client_qualification`** | On create: set `qualification_source` from payload (default `CRM_CASE`); reject unknown values; store in `QUALIFICATION_CREATED` event payload |

### Unchanged Q1 RPCs

- `fn_transition_qualification_status`
- `fn_reassign_qualification_owner`
- `fn_update_application_status`
- `fn_qualification_ingest_event`
- `fn_ingest_external_event` (stub)
- `fn_upsert_qualification_funding_plan`

**No archival guards** in Q1 (archival deferred).

---

## 6. UI scope (v1.2.2)

### In scope

| Element | Behaviour |
|---------|-----------|
| **List / header identity** | Institution + program + intake + case context (existing composite) |
| **Source badge** | Read-only `qualification_source` label (e.g. “CRM Case”) |
| Lifecycle, owner, app status, tracks, funding stub, timeline | Unchanged v1.2 base |

### Out of scope (removed vs v1.2.1)

- Qualification number in header, toast, or events
- Archive / unarchive actions
- “Show archived” toggle
- Archived read-only banner

### Create dialog

- Success toast: institution + intake (not a reference number)
- Source set implicitly to `CRM_CASE` from tab context

---

## 7. Deliverables / acceptance criteria (v1.2.2)

| # | Deliverable | Acceptance criteria | Status |
|---|-------------|---------------------|--------|
| 1 | M1a — period codes | Seeded; no eligibility wiring | Done |
| 2 | M1b — qual anchor + tracks | Anchor, deposit/tuition, funding plans | Done |
| 3 | M1c — events scaffold | Events, adjustment, external stub | Done |
| 4 | M1f — RLS + indexes | Client-scoped SELECT; RPC writes | Done |
| 5 | **`qualification_source`** | Enum on anchor; CRM_CASE default from tab; badge in UI | **Pending v1.2.2** |
| 6 | RPC — upsert patch | Source set on create; immutable | **Pending v1.2.2** |
| 7 | UI — Qualification tab | Composite identity; source badge | Done → **patch v1.2.2** |
| 8 | UI — Lifecycle + ON_HOLD | 8 states | Done |
| 9 | UI — Owner + app status | Independent of lifecycle | Done |
| 10 | UI — Deposit/tuition summary | Operational; paid=0 | Done |
| 11 | UI — Funding + timeline | Stub + audit events | Done |
| 12 | Tests — lifecycle + non-goals | No commission/SFL | Done → **extend source test** |
| 13 | UAT Q1-INT-01…16 | Base checklist | Pending publish/UAT |

**Q2 backlog (explicit):** archival metadata, `qualification_number` (revisit only if business requires), policy templates, A1 mapping, transfer case picker, IMPORT UI.

---

## 8. Test plan (v1.2.2)

| Suite | File | Cases |
|-------|------|-------|
| Lifecycle | `lifecycle.test.ts` | Transition matrix (unchanged) |
| Non-goals | `nonGoals.test.ts` | No commission/SFL imports (unchanged) |
| **Source** | `qualificationSource.test.ts` (new, small) | Default `CRM_CASE`; labels map; source not in forbidden commission tokens |
| Tab nav | ClientDetail tests | Qual tab registers |

**Removed vs v1.2.1:** `qualificationNumber.test.ts`, archival guard tests.

**CI gate:** `npm run test` green before ship.

---

## 9. Internal UAT (v1.2.2)

| ID | Scenario | Pass |
|----|----------|------|
| Q1-INT-01 | Open Qualification tab | ☐ |
| Q1-INT-02 | Create qualification → owner set; **source = CRM Case**; identity = institution + program + intake | ☐ |
| Q1-INT-03 | Summary shows no AR/trust/GL | ☐ |
| Q1-INT-04 | SFL cross-link works | ☐ |
| Q1-INT-05 | Funding plan stub | ☐ |
| Q1-INT-06 | Event timeline includes create event | ☐ |
| Q1-INT-07 | View-only permissions | ☐ |
| Q1-INT-08 | Commission Mark Eligible unchanged | ☐ |
| Q1-INT-11 | Draft → Active | ☐ |
| Q1-INT-12 | Active → Refused | ☐ |
| Q1-INT-13 | Active → On Hold (amber badge) | ☐ |
| Q1-INT-14 | On Hold → Active | ☐ |
| Q1-INT-15 | Reassign owner | ☐ |
| Q1-INT-16 | Application status change; lifecycle unchanged | ☐ |
| **Q1-INT-17** | **Source badge** visible on qual header; not editable in UI | ☐ |
| **Q1-INT-18** | **Re-create qual** after CANCELLED/REFUSED on same intake → allowed (lifecycle, not archival) | ☐ |

**Removed vs v1.2.1:** Q1-INT-17…20 (archive/unarchive/number) — moved to **Q2-UAT-ARCH-*** backlog.

**Owner:** Balveer + Engineering

---

## 10. Implementation sequence (v1.2.2 delta)

```
Day 1     Migration 20260901120200 — qualification_source enum + column + upsert patch
Day 1     types + constants + qualificationApi map
Day 1     UI — source badge on QualificationTabContent header
Day 1     qualificationSource.test.ts + npm run test
Day 2     UAT Q1-INT-01…18 on staging → Balveer sign-off
```

---

## 11. Effort impact (vs prior estimates)

| Plan version | Remaining delta effort | Notes |
|--------------|------------------------|-------|
| v1.2 base | ~0–1 day | Core already implemented in repo |
| v1.2.1 (number + source + archival) | ~4 days | Superseded |
| **v1.2.2 (source only)** | **~1–1.5 days** | Single small migration + badge + 1 test file + UAT |

**Saved vs v1.2.1:** ~2.5–3 days (number generation, sequence, archival RPCs/UI/tests/UAT).

**Total Q1 to sign-off (from current repo state):** ~**1.5 days engineering + 1 day Balveer UAT**.

---

## 12. Commission non-goals (unchanged)

- No `upi_commission_students` writes
- No eligibility / snapshot / claim / invoice RPCs
- No SFL balance import in Qual UI
- `qualification_source` must not trigger eligibility

---

## 13. Known limitations (Q1 by design)

- No qualification reference number (by decision v1.2.2)
- No archival — use lifecycle terminal states; COMPLETED → CLOSED to release unique slot
- No payment recording (Q4A)
- No schedule/milestones (Q2–Q3)
- No policy templates / A1 mapping (Q2)
- External events: stub only
- TRANSFER requires manual UUID (Q2 picker)

---

## 14. Next phase gate

**Q2 kickoff** after Q1-INT-01…18 pass. Q2 backlog includes archival metadata and other deferred items.

---

*v1.2.2 — qualification_source in Q1; qualification_number removed; archival deferred to Q2.*
