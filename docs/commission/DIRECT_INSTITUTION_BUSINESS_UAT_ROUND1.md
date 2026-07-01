# Direct Institution — Business UAT Round 1

**Status:** Ready for UAT  
**Scope:** UX and workflow only — Business Architecture V2.0 remains frozen  
**Not in scope:** F3.3, new backend rules, schema changes, commission engine changes

---

## UAT persona

Assume you are the **Operations Manager** or **Finance Manager** responsible for submitting institution commission claims. The objective is **not** to test code — it is to determine whether the workflow feels like a real commission department.

During this UAT phase, prioritize **usability over implementation speed**. If a workflow is technically correct but unintuitive for finance or operations users, refine the workflow before proceeding. The objective is to produce a system that new staff can learn with minimal training while remaining fully compliant with the frozen Business Architecture V2.0.

---

## UAT goals — answer these naturally

| # | Business question | Where to verify |
|---|-------------------|-----------------|
| 1 | What claims are ready today? | Claims tab → **Finance dashboard** (Ready badge, student counts) |
| 2 | Why are some students excluded? | Dashboard blockers list + student **Status** badges (Academic / Eligibility / Claim / Financial) |
| 3 | Can I verify every commission amount? | Student grid — **click any amount** → explanation dialog |
| 4 | Can I edit business information before submission? | Row **pencil** → edit sheet (tuition, scholarship, override, period, hold, notes, approved) |
| 5 | Can I validate the claim? | Workflow → **Validate claim** (mandatory before submit) |
| 6 | Can I preview exactly what will be submitted? | **Preview submission** / **Submission package** → tabbed preview |
| 7 | Can I generate the institution submission package? | Package dialog → Excel / Word / Email / Portal tabs → Export CSV |
| 8 | Can I generate the invoice if required? | Workflow → **Generate invoice** (hidden for portal/direct-payment institutions) |
| 9 | Can I record commission received? | **Record commission payment** → Commission payments tab |
| 10 | Can I reconcile submitted vs approved vs received? | Finance dashboard: Expected · Submitted · Inst. approved · Received · Outstanding · Variance |

---

## Demo institutions (after Publish + re-seed)

| Institution | Template profile | Demo highlights |
|-------------|------------------|-----------------|
| **Seneca** (8 students) | Email + Excel · HST · Semester | 2 scholarships, transfer, deferred, outstanding tuition, institution reduced, partial payment |
| **Conestoga** | Email + Word · GST · Term | Outstanding tuition hold, institution reduced commission, transfer target |
| **Humber** | Email + Excel · HST · Semester | Withdrawn excluded, semester-ready student (Sarah Okafor) |
| **Sheridan** | Portal only · no invoice · direct payment | Deferred (Maria), portal paid (Lucas Ferreira) |

**Re-seed after migrations:**

```sql
SELECT public.fn_seed_commission_direct_partner_demo();
```

Migrations: `20261031120004` (templates + extra students) · `20261031120005` (seed hook)

---

## UAT script (recommended order)

### Round 1A — Seneca (full claim lifecycle)

1. Institutions → **Seneca Polytechnic** → **Claims**
2. Read finance dashboard — note ready / blocked / hold counts
3. **Recalculate** → **Validate claim** → resolve any errors (mark eligible, release holds)
4. **Preview submission** → review all tabs (Template, Excel, Email, Validation)
5. **Approve submission package** → **Submit claim**
6. **Generate invoice** (if applicable) → **Record commission payment**
7. Commission payments tab → verify allocation for Priya partial payment

### Round 1B — Institution template differences

| Institution | Verify |
|-------------|--------|
| Humber | Excel preview uses **Semester** columns · HST in template |
| Conestoga | Word preview tab visible · GST · outstanding balance column |
| Sheridan | Portal tab · **no invoice** strip · direct payment student Lucas |

### Round 1C — Edit & explain (every student editable)

For any student row:

1. Click **Expected** amount → read explanation (rule, tuition, scholarship, override)
2. Open **edit sheet** → change scholarship → save → confirm commissionable base updates
3. Add **business notes** → visible in Notes column

### Round 1D — Reconciliation

On Seneca Fall 2026 (submitted cycle):

- Expected vs Submitted vs Inst. approved vs Received vs Outstanding
- Priya: partial payment CAD 2,000 / outstanding CAD 1,500
- Elena Petrova: institution reduced (CAD 3,500 → CAD 3,200)

---

## Pass criteria

UAT Round 1 passes when the finance manager can complete Round 1A–1D **without developer assistance** and answers **YES** to all ten business questions above.

Only after Business UAT Round 1 is approved will Phase 3 (F3.3) resume.

---

## Related docs

- [Demo walkthrough](./DIRECT_INSTITUTION_DEMO_WALKTHROUGH.md)
- [Claim UX redesign](./DIRECT_INSTITUTION_CLAIM_UX_REDESIGN.md)
- [ERP Delivery Standards](../erp-governance/DELIVERY_STANDARDS.md)
