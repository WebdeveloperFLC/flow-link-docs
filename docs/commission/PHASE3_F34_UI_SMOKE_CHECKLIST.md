# Phase 3 F3.4 — UI Smoke & Manual UAT Checklist

**Purpose:** Complete before F3.4 formal close and F3.3 start.  
**SQL gates (already approved):** `commission_phase3_f34_verification.sql` + `commission_phase3_f34_security_uat.sql`

Record results in `Commission module claude files/PHASE3_TRACEABILITY_MATRIX.md` §10 and update `docs/commission/PHASE_COMPLETION_CERTIFICATES/F3.4_COMPLETION.md`.

---

## A. UI smoke (required)

### A1 — Commission Admin · Claims

| Step | Action | Pass? | Notes |
|------|--------|-------|-------|
| A1-1 | Open any institution → **Claims** tab loads | ☐ | |
| A1-2 | **Recalculate** one eligible student (calculator icon) | ☐ | No RLS / permission error |
| A1-3 | **Submit claim** on a cycle with eligible students | ☐ | Toast success; rows show submitted |

### A2 — Commission Admin · Receipts

| Step | Action | Pass? | Notes |
|------|--------|-------|-------|
| A2-1 | Institution → **Receipts** tab loads | ☐ | |
| A2-2 | Open or create **draft** receipt | ☐ | |
| A2-3 | **Post** a ready receipt (or full wizard post) | ☐ | Status `posted` |
| A2-4 | **Void** a draft or posted receipt with reason | ☐ | Status `voided`; ledger correct |

### A3 — Counselor · No amounts

| Step | Action | Pass? | Notes |
|------|--------|-------|-------|
| A3-1 | Log in as **counselor** (not commission admin) | ☐ | |
| A3-2 | Client → Payments → institution commission status | ☐ | Lifecycle visible |
| A3-3 | Confirm **no** commission dollar amounts anywhere | ☐ | G-3 / 2A-12 |

---

## B. Phase 1 UAT — security-relevant subset

Run as **Commission admin**. Full script: `docs/guides/PHASE1_COMMISSION_UAT.md`

| ID | Scenario | Security / RLS relevance | Pass? |
|----|----------|--------------------------|-------|
| PF-1 | Confidential tabs visible | `can_view_commission_financial` | ☐ |
| PF-2 | Claims RPC actions work | Policies allow manage | ☐ |
| Scenario 1 steps 4–7 | Recalc, eligible, submit | Direct writes under manage policy | ☐ |
| G-3 | Counselor no amounts | Counselor view + RLS | ☐ |

---

## C. Phase 2A UAT — security-relevant subset

Full script: `docs/guides/PHASE2A_COMMISSION_UAT.md`

| ID | Scenario | Security / RLS relevance | Pass? |
|----|----------|--------------------------|-------|
| 2A-1 | Create draft receipt | Receipt INSERT policy | ☐ |
| 2A-3 | Post receipt | Manage + RPC | ☐ |
| 2A-11 | Claims → Record receipt | Cross-tab navigation | ☐ |
| 2A-12 | Counselor view unchanged | Non-confidential read | ☐ |
| 2A-15 | Void draft | DELETE/manage policy | ☐ |
| 2A-16 | Void posted | Manage + RPC | ☐ |
| 2A-20 | Posted immutable | Trigger (also in SQL S4) | ☐ |

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Commission admin (UI smoke) | | | Pass / Fail |
| Counselor (A3) | | | Pass / Fail |
| Product owner | | | Approve F3.4 close |

When all boxes are Pass, reply **“F3.4 validated”** to begin F3.3.
