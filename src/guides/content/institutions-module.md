# Institutions Module — Staff Operational Guide

Use the **search bar** at the top of this page to find answers — try keywords like *publish*, *permissions*, *sync*, or *empty review*.

> **TIP:** This guide is for **day-to-day staff and team leads**. Admins should read sections **10–11** when onboarding new users.

---

## 1. Quick search — find your answer

| I want to… | Search for | Section |
|------------|------------|---------|
| Publish programs to Course Finder | `publish` `course finder` | §4 Step 5–6 |
| Fix empty Course Review | `empty review` `sync` | §4 Step 2–3, §12 |
| Understand who can see what | `permissions` `view-only` | §3, §9 |
| Upload a program PDF | `upload` `program sheet` | §5 |
| Upload agreement / commission file | `confidential` `agreement` | §5 |
| Approve or reject courses | `approve` `reject` | §4 Step 4, §6 |
| Run website sync | `sync` `source` | §4 Step 2 |
| Set up a new staff member | `onboarding` `permissions` | §11 |
| Agreements tab is locked | `locked` `commission` | §3, §12 |
| Something failed / error message | `troubleshoot` | §12 |

### At-a-glance: the whole pipeline

```flow
Add Institution
Complete Profile
Add Source (URL or PDF)
Sync / AI Extract
Course Review
Approve Rows
Publish to Course Finder
Live in Catalog
```

---

## 2. Where to find it in the app

```navmap
Institution → Institutions | /institutions | School list & stats
Institution → Course Review | /institutions/review | Program approval queue
Institution → AI Suggestions | /institutions/suggestions | Cross-school AI inbox
Institution → [school name] | /institutions/:id | Single school workspace
Course Finder | /course-finder | Published catalog (search programs)
Commissions | /commissions | Claims & invoices (finance only)
Guide → Institutions Module | /guides/institutions-module | This guide
```

### System map — how screens connect

```flow
Institutions List
Institution Detail
Sources + Documents
AI Extraction
Course Review Queue
Course Finder (live)
```

> **NOTE:** Course Finder is the **output**. Institutions is the **pipeline** that feeds it.

---

## 3. Two-tier access model (permissions)

Access is split into **catalog** (programs & schools) and **confidential** (money & contracts). Both the **UI and database** enforce this.

```tier
Catalog / Institutions staff | Confidential / Commission staff
Institutions View or Edit | Commission Admin, Accounting, or Commissions module
List schools & Course Review | Agreements, Commissions, Claims tabs
Upload program sheets & brochures | Upload agreements & commission sheets
Approve & publish to Course Finder | Invoice templates, renewal docs, claim cycles
Promotions & marketing campaigns | Commission students & invoicing
```

### Who gets which tier?

| Role label | How granted | Typical job |
|------------|-------------|-------------|
| **Institutions View** | Team & roles → Institutions → **View** | Read-only QA, browse queue |
| **Institutions Edit** | Team & roles → Institutions → **Edit** | Sources, sync, upload, publish |
| **Commission View** | Commissions View, Accounting user, or `commission_admin` | See agreements & claims |
| **Commission Admin** | Commissions Edit or `commission_admin` role | Edit agreements, commissions, claims |
| **Super Admin** | App role Admin | Everything |

### Permissions matrix (quick reference)

| Action | Inst. View | Inst. Edit | Comm. View | Comm. Admin |
|--------|:----------:|:----------:|:----------:|:-----------:|
| Open list & detail | ✓ | ✓ | ✓ | ✓ |
| Edit profile / sync / upload catalog docs | — | ✓ | — | — |
| Course Review — approve / publish | — | ✓ | — | — |
| Upload confidential documents | — | — | — | ✓ |
| Agreements / Commissions / Claims tabs | 🔒 Locked | 🔒 Locked | ✓ View | ✓ Edit |

> **WARNING:** Yellow **view-only** banner = user has View but not Edit. They can browse but cannot save, sync, upload, or publish.

### Permission decision tree

```decision
Can you open Institution in the sidebar?
  → No: Ask admin for Institutions View (§11)
  → Yes: Do you see a yellow view-only banner?
    → Yes: You have View only — request Edit to publish
    → No: Can you see Agreements tab on a school?
      → No: Expected for catalog staff — request Commission access if needed
      → Yes: You have confidential tier access
```

---

## 4. Institution lifecycle (step by step)

### End-to-end flow

```flow
Add Institution
Complete Profile
Add Website Source OR Upload Program Sheet
Click Sync Now
Rows Appear in Course Review
Approve Each Row
Bulk Publish
Verify in Course Finder
```

---

### Step 1 — Add institution

**Who:** Institutions **Edit** · **Where:** `/institutions` → **Add institution**

| Field | Required? | Example |
|-------|:---------:|---------|
| Name | ✓ | Conestoga College |
| Country | Recommended | Canada |
| Website | Recommended | https://www.conestogac.on.ca |

---

### Step 2 — Add sources

**Who:** Institutions **Edit** · **Where:** Institution detail → **Sources** tab

| Source type | When to use | Example |
|-------------|-------------|---------|
| **Website URL** | School lists programs online | `https://example.edu/programs` |
| **Document link** | PDF/Excel already uploaded | Pick from Documents tab |

After adding → click **Sync now** (or **Sync all**).

> **TIP:** If sync fails (bot block, bad URL), upload a **Program sheet** PDF instead — often more reliable.

---

### Step 3 — Sync & extraction

**Who:** Institutions **Edit** · **Action:** **Sync now**

You do **not** manually create course rows. Sync writes to the review queue automatically.

**Watch for:**
- Source row status & error text
- Course Review filter: Status = `pending_review`

---

### Step 4 — Review programs

**Who:** View = browse · Edit = action · **Where:** `/institutions/review`

**Filters** (saved in URL — bookmarkable):

| Filter | Start with |
|--------|------------|
| Status | `pending_review` |
| Institution | One school at a time |
| Search | Title, IELTS, campus, intake |

**Review statuses:**

```status
pending_review
approved
published
```

```status
pending_review
rejected
```

```status
pending_review
needs_update
approved
published
```

| Status | Meaning |
|--------|---------|
| `pending_review` | Newly extracted — needs review |
| `approved` | Ready to publish |
| `rejected` | Do not publish |
| `needs_update` | Fix or re-sync first |
| `published` | **Live** in Course Finder |

---

### Step 5 — Approve & publish

**Who:** Institutions **Edit**

1. **Approve** — single row or bulk checkbox → **Bulk Approve**
2. **Publish** — only **approved** rows → **Bulk Publish** or per-row publish button

> **WARNING:** Publish calls the server. If some rows fail, read the toast — often a permission or validation issue.

---

### Step 6 — Verify in Course Finder

**Who:** Anyone with Course Finder access · **Where:** `/course-finder`

After publish:
- Row status → `published`
- **View in Course Finder** link appears on the row
- Search by institution name to confirm tuition & intakes

---

## 5. Document types (catalog vs confidential)

### Catalog documents — Program materials

| Type | Purpose | AI does |
|------|---------|---------|
| **Program sheet** | Official program list | Extract **all programs** → Course Review |
| **Brochure** | Marketing flyer | Detect promotions |
| **Promotion / Campaign** | Promo materials | Structured promo extraction |
| **Other** | General file | Generic extraction |

**Who uploads:** Institutions **Edit** · **Who sees:** All Institutions users

---

### Confidential documents — Commission staff only

| Type | Purpose |
|------|---------|
| **Agreement** | Partner contract (RAA/MOU) |
| **Commission sheet** | Payout rate card |
| **Invoice template** | How institution bills you |
| **Renewal document** | Contract renewal pack |

**Who uploads:** Commission **Admin** · **Who sees:** Commission View and above

Catalog-only users see: *"N confidential documents hidden"* — this is **expected**.

### Document upload cheat sheet

| Document | Upload | View list |
|----------|:------:|:---------:|
| Program sheet, Brochure, Promo | Inst. Edit | Inst. View |
| Agreement, Commission sheet, Invoice | Comm. Admin | Comm. View |

---

## 6. Course Review — daily workflow

### Status flow (visual)

```status
pending_review
approved
published
```

### Daily checklist (documentation team)

| # | Task |
|---|------|
| 1 | Open Course Review → filter `pending_review` |
| 2 | Check title, tuition, intakes, IELTS, PGWP, campus |
| 3 | Edit obvious AI errors (pencil icon) |
| 4 | **Approve** or **Reject** each row |
| 5 | Filter `approved` → **Bulk Publish** |
| 6 | Spot-check in Course Finder |

### Confidence scores

| Score | What to do |
|-------|------------|
| **≥ 80%** | Usually reliable — still check tuition & intake |
| **50–79%** | Review carefully |
| **< 50%** | Likely incomplete — edit or re-sync source |

### Bulk actions

Select checkboxes → **Bulk Approve** · **Bulk Reject** · **Bulk Publish**

> **NOTE:** If bulk update says *"Updated X of Y"* — some rows were blocked by permissions. Confirm you have Institutions **Edit**.

---

## 7. AI Suggestions

Two places:

| Location | Route / tab | Use |
|----------|-------------|-----|
| **Global inbox** | `/institutions/suggestions` | Cross-school pending items |
| **Per school** | Institution → AI Suggestions tab | Ask AI about one partner |

**Actions (Edit required):** Accept · Dismiss · Defer

**Example prompt:** *"Which programs should we prioritize for September intake?"*

---

## 8. Commission & claims (finance only)

Visible only to **Commission View** and above on institution detail:

| Tab | Purpose |
|-----|---------|
| **Agreements** | Contract dates, renewal countdown |
| **Commissions** | Rate models & rules |
| **Claims** | Claim cycles, students, invoicing, CSV export |

Global overview: `/commissions`

---

## 9. Screens vs permissions (reference)

| Screen | Needs |
|--------|-------|
| Sidebar **Institution** section | Institutions **View** |
| Add institution / save profile | Institutions **Edit** |
| Sources — sync / delete | Institutions **Edit** |
| Documents — catalog upload | Institutions **Edit** |
| Documents — confidential | Commission **Admin** |
| Course Review — table | Institutions **View** |
| Course Review — approve / publish | Institutions **Edit** |
| Agreements / Commissions / Claims | Commission **View** |
| Course Finder | Broader app access |

---

## 10. Recommended access by department

| Department | Institutions | Commissions | Notes |
|------------|:------------:|:-----------:|-------|
| Admissions / Counselors | View | — | Search Course Finder only |
| Documentation / Program research | **View + Edit** | — | Primary catalog operators |
| Marketing | View + Edit | — | Brochures, campaigns |
| Partnerships / BD | View + Edit | View | May need to *see* agreements |
| Commission / Finance | View | **View + Edit** | `commission_admin` or Accounting |
| Team leads / Ops | View + Edit | View | Oversight |
| Administrators | Admin | Admin | Full access |

### Persona quick picks

| I am… | Grant |
|-------|-------|
| "I only search programs for clients" | Institutions **View** (or Course Finder) |
| "I maintain the catalog" | Institutions **View + Edit** |
| "I handle partner invoices" | Commissions **View + Edit** + Accounting |
| "I do catalog and commissions" | Institutions **Edit** + Commissions **Edit** |

---

## 11. Admin onboarding checklist

| Step | Action |
|:----:|--------|
| 1 | Create / confirm user login |
| 2 | **Team & roles → Permissions** — assign modules |
| 3 | Catalog staff → Institutions **View + Edit** |
| 4 | Read-only QA → Institutions **View** only |
| 5 | Finance → Commissions **Edit** or `commission_admin` |
| 6 | User **logs out and back in** |
| 7 | Verify checklist below |

### 5-minute verification

- [ ] Opens `/institutions`
- [ ] Opens `/institutions/review` — sees rows or empty (not permission error)
- [ ] If Edit: can save a name change
- [ ] If Edit: can Sync or upload program sheet
- [ ] If commission: Agreements tab visible
- [ ] If catalog only: Agreements shows **locked** message

---

## 12. Troubleshooting

### Search by symptom

| Symptom | Search | Likely cause | Fix |
|---------|--------|--------------|-----|
| Access restricted | `permissions` | No Institutions View | Grant View in Permissions |
| Yellow view-only banner | `view-only` | View without Edit | Request Edit if they should publish |
| Course Review empty, no error | `empty review` `sync` | No programs extracted yet | Add source → Sync |
| Red error loading courses | `permissions` `RLS` | Permission denied | Grant Institutions View |
| Agreements tab locked | `locked` `commission` | Catalog-only user | Expected — or grant Commission access |
| Confidential docs hidden | `confidential` | Catalog user | Expected for catalog staff |
| Upload fails | `confidential` | Wrong tier for doc type | Commission Admin for agreements |
| Sync failed | `sync` `troubleshoot` | Bad URL / bot block | Fix URL or upload PDF |
| Publish failed | `publish` | Row not approved | Approve first; read toast |
| Not in Course Finder after publish | `course finder` | Search mismatch | Search by institution name |
| Infinite loading on school page | `troubleshoot` | Invalid URL / ID | Use list page link |

### Permission vs data — network test

```decision
Open Course Review with Network tab (F12)
  → Response 200 with empty array [] ?
    → Permissions OK — add source and sync
  → Response 403 or RLS error ?
    → Fix Institutions or Commissions permissions (§11)
```

---

## 13. Rollout checklist (go-live)

| Phase | Tasks |
|-------|-------|
| **A — Access** | RLS migration applied · permissions matrix agreed · pilot users created |
| **B — Pilot** | One real school · one source or PDF · sync → review → publish → verify Course Finder |
| **C — Team** | Share this guide · walkthrough lifecycle (§4) · define publish owner & SLA |
| **D — Scale** | Bulk onboarding · monitor pending review count · weekly AI Suggestions review |

---

## 14. Example scenarios

### A — New college from website

```flow
Add Northern Polytechnic
Add program listing URL
Sync Now
Course Review → Approve 10 rows
Bulk Publish
Verify in Course Finder
```

### B — PDF only (no website)

```flow
Upload Program Sheet PDF
Wait for extraction
Edit wrong intakes
Approve → Publish
```

### C — Finance onboarding

```flow
Catalog team publishes programs
Commission admin uploads Agreement + Commission sheet
Verify rates in Commissions tab
Open claim cycle when students enroll
Catalog counselor cannot see agreement PDF ✓
```

---

## 15. Glossary

| Term | Meaning |
|------|---------|
| **Staging** | Pre-publish rows in Course Review queue |
| **Publish** | Push approved row to live Course Finder |
| **Source** | Website URL or document used for extraction |
| **Catalog tier** | Institutions access — programs & schools |
| **Confidential tier** | Commission access — contracts & money |
| **Course Finder** | Published catalog at `/course-finder` |

---

## 16. Support & escalation

| Issue | Escalate to |
|-------|-------------|
| Permission / access | System admin (Team & roles) |
| Sync fails repeatedly | Program research + IT (try PDF upload) |
| Publish errors | Admin / dev (`upi-publish-courses` logs) |
| Wrong data live in Course Finder | Inst. Edit: set `needs_update`, fix, re-publish |

---

*Last updated: Institutions module Phases 1–4 — two-tier RLS, Course Finder links, role UI gating, Staff Guides module.*
