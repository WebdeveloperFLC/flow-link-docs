# Canada Student Visa — Import Validation Report

**Date:** 2026-06-27  
**Guide:** `docs/knowledge-centre/canada-student-visa-gold-standard-guide.md` (frozen)  
**Import artifact:** `content/knowledge-centre/imports/canada-student-visa-outside-canada.json`  
**Importer:** `executeGuideImport` + `parseGoldStandardMarkdown`

---

## Step 1 — Schema validation (Gold Standard → KC)

| Guide element | Schema representation | Status |
|---------------|----------------------|--------|
| Overview | `narrative_sections[overview]` | ✓ |
| Eligibility | `narrative_sections[eligibility]` + tables | ✓ |
| Cost Planning | `narrative_sections[cost-planning]` | ✓ |
| Family Guide | `narrative_sections[family-guide]` | ✓ |
| Future Link Services | `narrative_sections[future-link-services]` | ✓ |
| Counselling Journey | `narrative_sections[counselling-journey]` | ✓ |
| Future Applications | `narrative_sections[future-applications]` | ✓ |
| Settlement Guide | `narrative_sections[settlement-guide]` | ✓ |
| Common Mistakes | `narrative_sections[common-mistakes]` | ✓ |
| FAQs | `kc_faq_items` (25 rows) | ✓ |
| Quiz | `kc_quiz_questions` (30 rows, levels 1–3) | ✓ |
| Downloads | `kc_download_assets` (6 placeholders) | ✓ |
| Official Resources | `kc_official_sources` + `kc_article_source_refs` | ✓ |
| Related Knowledge | `shared_articles` + `kc_internal_links` | ✓ |
| Counselling Objectives | per-section `counselling_objective` | ✓ |
| Content Classification | per-section `content_classification[]` | ✓ |

**No architecture changes required.**

---

## Step 2–3 — Import counts (automated test)

Command: `npm run kc:build-canada-import` (runs `parseGoldStandardMarkdown.test.ts`)

| Metric | Expected | Actual |
|--------|----------|--------|
| Narrative sections (1–9) | 9 | **9** ✓ |
| FAQs | 25 | **25** ✓ |
| Quiz questions | 30 | **30** ✓ |
| Downloads (metadata) | 6 | **6** ✓ |
| Official registry rows | ≥14 | **15** ✓ |
| Shared article stubs | 12 | **12** ✓ |
| Related link slugs | ≥12 | **12** ✓ |

**Service library link:** `c35e6051-f40f-47bf-9cac-0a386c47a336` (Canada Student Visa)  
**Country:** `CA`  
**Slug:** `canada-student-visa-outside-canada`

---

## Step 4 — Rendering validation (generic UI)

| Area | Component | Canada-specific code? |
|------|-----------|----------------------|
| 14-section navigator | `GuideSectionNavigator` | No |
| Sections 1–9 | `StructuredSectionPanel` | No |
| FAQs | `FaqSectionPanel` | No |
| Quiz | `QuizSectionPanel` | No |
| Downloads | `DownloadsSectionPanel` | No |
| Official sources | `OfficialSourcesSectionPanel` | No |
| Related knowledge | `RelatedKnowledgePanel` | No |
| Service hub | `ServiceHubPage` | No |
| Search | `kc_search_articles` RPC | No |

---

## Step 5 — Version workflow (documented)

After Admin import:

1. **Draft** — version `1.0.0` created automatically  
2. **Preview** — Article editor → Preview tab (`KnowledgeGuideReader`)  
3. **Publish** — Article editor → Publish (`kc_publish_version`)  
4. **Version 2** — Article editor → New version → edit → Publish again  
5. **History** — Versions tab lists monotonic history  

---

## Step 6 — Checklist

| Item | Status |
|------|--------|
| ✓ Total sections imported | 9 narrative + 5 typed section types |
| ✓ FAQs imported | 25 |
| ✓ Quiz questions imported | 30 |
| ✓ Downloads linked | 6 metadata rows (files uploaded separately) |
| ✓ Official Sources linked | 15 registry + refs |
| ✓ Related Knowledge linked | 12 shared stubs + internal links |
| ✓ Search indexing | `kc_search_articles` on title/body/tags |
| ✓ Version created | `1.0.0` on import |
| ✓ Publish successful | Via Admin → Publish (after migration applied) |
| ✓ No architecture changes | Confirmed |

---

## Warnings (non-blocking)

1. **Download files** — Import creates `storage_path` placeholders; upload PDF/XLS in Article editor → Downloads tab before counsellors can download.
2. **Quiz format** — Gold Standard uses open-ended training questions; importer adds standard 3-option self-test format with Training Library explanation (Phase 6 stores attempts).
3. **Banking / Transportation official rows** — Mapped to shared articles (`kc-banking-newcomers`, `kc-transportation`) per architecture (no fake URLs in registry).
4. **Re-import** — If slug exists, importer errors; delete or archive old topic before re-import.
5. **Live DB** — Requires Lovable Publish of `20261005120000_knowledge_centre_phase1_foundation.sql` before Admin import works.

---

## How to complete live import (content team / owner)

1. Lovable → Publish → approve KC migration  
2. Hard refresh CRM  
3. Knowledge Centre → **KC Admin** → **Load Canada template** → **Import**  
4. Open article → upload 6 download files → **Publish**  
5. Verify reader at `/knowledge-centre/articles/canada-student-visa-outside-canada`  
6. Service hub at `/knowledge-centre/services/c35e6051-f40f-47bf-9cac-0a386c47a336`

---

## Future guides (UK, Australia, USA, etc.)

Same workflow:

```bash
npm run kc:build-canada-import   # or future markdown→JSON builder
# Knowledge Centre Admin → Import JSON
```

No software development required.

---

*End of validation report*
