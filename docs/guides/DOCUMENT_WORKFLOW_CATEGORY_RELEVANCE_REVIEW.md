# Document Workflow — Category & Relevance Business Validation Review

**Status:** Pre–Phase 2B gate  
**Context:** Phase 2A UAT — Canada Spouse / Dependent Visitor Visa; manual add of "10th Marksheet" deemed inappropriate.

---

## Executive summary

The immediate bug class is **not** “Add Document forces mandatory” (default is already optional). The business issue is **lack of visa-context relevance**:

1. Counselors can add any master document type to any case.
2. No category or ranking is shown in Add Document.
3. Template seeds may still include **academic mandatory items** on non-student visas (separate from manual add).

**Recommendation:** Adopt a **two-layer model** — stable **document categories** on master data + **service relevance profiles** for ranking/hiding — without blocking counselor override via search.

Phase 2A.2 ships **UI relevance** (implemented). Phase 2B+ should add **DB-backed categories** and **template hygiene**.

---

## 1. Document category model — recommendation

### Proposed canonical categories

| Category | Examples |
|----------|----------|
| **Academic** | 10th/12th Marksheet, Degree, Transcript, IELTS, Offer Letter |
| **Identity** | Passport, Birth Certificate, National ID |
| **Relationship** | Marriage Certificate, Wedding Photos, Relationship Proof, Divorce Decree |
| **Police** | PCC |
| **Financial** | Bank Statement, GIC, Sponsor Funds, ITR |
| **Employment** | Employment Letter, Salary Slips, Experience Letter |
| **Medical** | Medical Exam Report |
| **Travel** | Visa Refusal Letter, Travel History |
| **Family** | Dependent documents, family forms |
| **Forms** | IMM forms, SOP (student-specific) |
| **Other** | Catch-all |

### Storage (recommended)

| Layer | Field | Purpose |
|-------|-------|---------|
| **Source of truth** | `master_items.metadata.category` | Stable code (`relationship`, `academic`, …) |
| **Optional** | `master_items.metadata.aliases[]` | Search terms (PCC, wedding photo) |
| **Runtime fallback** | `resolveDocumentCategory()` heuristics | Until all document_types seeded |

**Why not only heuristics?** Label rules drift; counselors need consistent `(Category)` labels in Add Document and reporting.

**Migration (Phase 2B prep):** One-time UPDATE on `master_items` where `list_key = 'document_types'` — no schema change.

### ADR linkage

Manual adds already store `master_item_code`. Category is **derived from master**, not duplicated on `application_document_requirements` (avoids drift). Optional future column `display_category` only if counselors can override section vs category independently.

---

## 2. Relevance ranking model — recommendation

### Service profiles (detected from `service_code` + template name)

| Profile | Detection hints | Default category priority |
|---------|-----------------|---------------------------|
| **spouse_dependent** | spouse, dependent visitor, partner, super visa | Relationship → Identity → Financial → … → Academic last |
| **student** | student, study permit, SDS, college | Academic → Financial → Identity → … |
| **visitor** | visitor, tourist, TRV | Identity → Financial → Travel → … → Academic last |
| **work** | work permit, LMIA | Employment → Identity → Financial → … |
| **general** | fallback | Identity → Financial → balanced |

### Ranking rules (implemented in Add Document)

1. **Sort** picker groups by profile priority.
2. **Soft-hide** categories irrelevant to profile (e.g. Academic for spouse/visitor) **until user searches**.
3. **Never hard-block** — counselor can type "10th" and add if truly needed.

### Future enhancement (Phase 2B+)

- Store profile on `workflow_templates.metadata.relevance_profile` instead of inferring from name.
- Template materialization: **do not auto-include** categories marked `excluded_by_default` for that profile (Marriage Certificate forced-include on spouse templates remains).

---

## 3. Should academic documents be hidden for non-student visas?

### Recommendation: **Soft-hide, not hard-block**

| Approach | Pros | Cons |
|----------|------|------|
| **Hard-hide** | Cleaner UX | Blocks edge cases (prior studies, credential assessment) |
| **Soft-hide (chosen)** | Contextual defaults + override | Counselor must know to search |
| **Show but deprioritize only** | Maximum flexibility | Still clutters default list |

**Also required:** Audit **workflow_templates** for Canada Spouse — remove academic items from **template mandatory set**, not only Add Document picker.

**Template rule:** Generic visitor/spouse templates should **exclude** academic items from `items`/`groups`. Student templates **include** academic. Conditional items (Marriage Certificate) use `default_inclusion: conditional` in master metadata; spouse templates **force-include**.

---

## 4. Mandatory toggle — validation

| Rule | Current behavior | Status |
|------|------------------|--------|
| Manual add default | `mandatory = false` (RPC + UI) | ✓ Correct |
| Optional add | Does not affect Required/Missing/% | ✓ Correct |
| Required toggle ON | Increments Required + Missing | ✓ Correct |
| Template mandatory items | Always required; not controlled by Add Document | By design |

**If "10th Marksheet" showed Required and affected progress:**

- **Case A:** Mandatory toggle was ON → counselor action.
- **Case B:** Item already on checklist from **template** as mandatory → fix template seed, not Add Document.
- **Case C:** Re-add conflict upgraded mandatory → RPC ON CONFLICT should preserve template mandatory unless explicit (future hardening).

UI now labels toggle **"Mandatory document"** with default optional and button text **"Add as optional"**.

---

## 5. What shipped in Phase 2A.2 (this fix)

- `documentCategories.ts` — category resolution + `Label (Category)` display
- `documentRelevance.ts` — service profiles + hide academic for spouse/visitor until search
- Add Document grouped by category, sorted by visa relevance
- Mandatory toggle clarified

---

## 6. UAT retest checklist (before Phase 2B)

- [ ] Canada Spouse case → Add Document → **Academic not in default list**
- [ ] Search "10th" → 10th Marksheet appears as **(Academic)**
- [ ] Marriage Certificate shows **(Relationship)** near top
- [ ] Add with toggle OFF → **Optional** badge, progress unchanged
- [ ] Add with toggle ON → Required +1, Missing +1
- [ ] Template mandatory spouse docs (Passport, etc.) unchanged

---

## 7. Phase 2B gate

Proceed when:

1. UAT confirms relevance + optional default on spouse visa case.
2. Template audit ticket opened for Canada Spouse (remove stray academic mandatory items from base template if any).
3. Decision to seed `master_items.metadata.category` (recommended before admin template editor).

**Do not proceed to Party View until above sign-off.**
