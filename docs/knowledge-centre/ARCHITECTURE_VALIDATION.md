# Knowledge Centre Architecture Validation

**Gate:** Pre-Implementation  
**Benchmark:** Canada Student Visa (Outside Canada) Gold Standard Guide v1.0  
**Architecture contract:** Functional Specification v1.0 + frozen KC architecture  
**Date:** 2026-06-27  
**Status:** Draft for approval

---

## Executive summary

The approved `kc_*` schema can represent **100% of the Gold Standard Guide** when the Canada guide is modelled as **one service-scoped Knowledge Topic** (`kc_articles`) with:

- **Sections 1–9** in `kc_article_versions` (`content_format = structured`, section blocks in `content_body` JSON)
- **Sections 10–14** in existing satellite tables (`kc_faq_items`, `kc_quiz_questions`, `kc_download_assets`, `kc_official_sources` + `kc_article_source_refs`, `kc_internal_links`)
- **Section metadata** (Counselling Objective, Content Classification, journey stage) in structured JSON + `metadata` — no new business entities

**Verdict:** **APPROVED WITH MINOR CHANGES** (metadata / configuration only — see §9 and §3).

---

## 1. Complete Mapping Matrix

### 1.1 Modelling convention (Gold Standard → schema)

| Concept | Implementation |
|---------|----------------|
| Gold Standard Master Guide | One `kc_articles` row: `article_kind = service`, slug e.g. `canada-student-visa-outside-canada` |
| Country scope | `kc_article_countries` → `countries.code = CA` |
| Service scope | `kc_article_services` → `service_library.id` (Canada Student Visa Outside Canada row) |
| 14 guide sections | Section manifest in `kc_articles.metadata.guide_sections` (order + type); UI renders generically |
| Narrative sections (1–9) | `kc_article_versions.content_body` structured JSON section blocks |
| Typed sections (10–14) | Satellite tables on same `version_id` |
| Deep-dive articles (Proof of Funds, PGWP, etc.) | Separate `kc_articles` (`shared` or `country`) via `kc_internal_links` |
| Institution Master / Fee Master / Document Library | `metadata.external_module_refs` on article or section (CRM route keys — not KC content) |

### 1.2 Master mapping table

| Guide Section | DB Table(s) | Parent Record | Child Record(s) | Relationships | CRUD Screen | Versioned | Searchable | Downloadable |
|---------------|-------------|---------------|-----------------|---------------|-------------|-----------|------------|----------------|
| **1 · Overview** | `kc_articles`, `kc_article_versions` | Article (service master) | Structured section block `id=overview` in `content_body` | 1:N article→versions; section embedded in version | KC Admin editor → Service hub reader §1 | Yes (version body) | Yes (FTS on body + title) | No |
| **2 · Eligibility Summary** | `kc_articles`, `kc_article_versions`, `kc_article_source_refs`, `kc_official_sources`, `kc_internal_links` | Article version | Section block `id=eligibility`; source refs; links to Proof of Funds, PAL/TAL articles | Section → refs → registry; section → internal links | Admin editor; reader §2; Official Sources registry | Yes | Yes | No |
| **3 · Cost Planning** | `kc_articles`, `kc_article_versions`, `kc_download_assets`, `kc_article_source_refs` | Article version | Section `id=cost-planning`; download `budget_planner`; IRCC fee/funds refs | Version → download assets; version → source refs | Admin; Downloads library; reader §3 | Yes (section + download version optional) | Yes | Yes (Budget Planner) |
| **4 · Family Guide** | `kc_articles`, `kc_article_versions`, `kc_internal_links`, `kc_article_source_refs` | Article version | Section `id=family-guide`; links Family Rights, Working Rights | Internal links M:N | Admin; reader §4 | Yes | Yes | No |
| **5 · Future Link Services** | `kc_articles`, `kc_article_versions` | Article version | Section `id=future-link-services`; table rows in structured JSON | `metadata.external_module_refs` → Institution Master, Fee Master | Admin; reader §5 | Yes | Yes | No |
| **6 · Counselling Journey** | `kc_articles`, `kc_article_versions`, `kc_download_assets` | Article version | Section `id=counselling-journey` (17 stages); download `meeting_checklist` | Download linked to version; stages in structured JSON | Admin; reader §6; Downloads | Yes | Yes | Yes (Meeting Checklist) |
| **7 · Future Applications** | `kc_articles`, `kc_article_versions`, `kc_internal_links` | Article version | Section `id=future-applications`; link PGWP article | Internal link to PGWP topic | Admin; reader §7 | Yes | Yes | No |
| **8 · Settlement Guide** | `kc_articles`, `kc_article_versions`, `kc_download_assets`, `kc_internal_links` | Article version | Section `id=settlement-guide`; download `settlement_checklist`; links Accommodation, Banking, etc. | Downloads + internal links | Admin; reader §8; Downloads | Yes | Yes | Yes (Settlement Planner) |
| **9 · Common Mistakes** | `kc_articles`, `kc_article_versions` | Article version | Section `id=common-mistakes` (numbered list + prevention notes) | Embedded in version body | Admin; reader §9 | Yes | Yes | No |
| **10 · FAQs** | `kc_faq_items`, `kc_article_versions`, `kc_articles` | Article version | 25 `kc_faq_items` rows (`sort_order` 1–25) | FAQ.version_id → version; FAQ.article_id → article | Admin FAQ editor; `/knowledge-centre/faqs` filter; reader §10 | Yes (per version) | Yes (question/answer FTS) | No |
| **11 · Quiz** | `kc_quiz_questions`, `kc_article_versions`, `kc_articles` | Article version (`article_kind=quiz` hub OR service version) | 30 questions: `level` 1=Beginner, 2=Intermediate, 3=Advanced | Quiz.version_id → version | Admin quiz editor; `/knowledge-centre/quiz/:slug`; reader §11 | Yes | Yes (question text) | No |
| **12 · Downloads** | `kc_download_assets`, `kc_article_versions`, `kc_articles` | Article version | 6 assets: counsellor_guide, meeting_checklist, budget_planner, arrival_checklist, settlement_checklist, other+packing_list | Asset.version_id; `metadata.journey_stage` | Admin upload; Downloads library; reader §12 | Yes (asset rows / version scope) | Yes (title) | Yes (all templates) |
| **13 · Official Resources** | `kc_official_sources`, `kc_article_source_refs`, `kc_article_versions` | Registry (global) + version refs | 17 registry rows (IRCC, CRA, provincial, etc.); refs on version | Registry 1:N refs; UNIQUE `official_url` | `/knowledge-centre/official-sources`; Admin; reader §13 chips | Registry: verify date; refs versioned with article | Yes (authority, title, category) | No (link only) |
| **14 · Related Knowledge** | `kc_internal_links`, `kc_articles` | Article version | Links to 12 shared articles (Proof of Funds, PGWP, …) | `from_version_id` → `to_article_id`; `link_type=related` | Admin link picker; reader §14 | Yes (links on version) | Yes (target article title) | No |
| **Counselling Objectives** | `kc_article_versions.content_body` (structured) | Section block | Field `counselling_objective` per section 1–14 | Not a separate table | Rendered in reader footer per section | Yes | Yes (FTS) | No |
| **Content Classification** | `kc_article_versions.content_body` + section `metadata` | Section block | Field `content_classification[]` e.g. `future_link`, `official_reference`, `download`, `related_knowledge` | Drives chip UI; no duplicate content | Admin section metadata | Yes | Yes (metadata filter Phase 3+) | No |
| **CER (counselling progress)** | `client_education_records`, `client_timeline` | `clients` | CER row per explain event | `kc_article_id` = master guide; `metadata.section_key` optional; `kc_article_version_id` snapshot | Client Detail → Education tab | Snapshot yes; live read separate | Yes (notes, topic title) | No |
| **Version badge (guide header)** | `kc_articles`, `kc_article_versions` | Article | `current_version_id`, `version_label` | Live pointer | Topic reader header | Yes | Yes | No |
| **Search (global)** | `kc_articles`, `kc_article_versions`, satellites | — | RPC `kc_search_articles` | Aggregates topics + FAQ | `/knowledge-centre/search` | Published only | Yes | Partial (download hits link to asset) |

### 1.3 Related Knowledge articles (Section 14 — separate topics, not duplicated)

Each deep-dive is its **own** `kc_articles` row (`article_kind = shared` or `country`), linked only via `kc_internal_links`:

| Related article | Typical `article_kind` | Linked from sections |
|-----------------|------------------------|----------------------|
| Proof of Funds | `shared` | 2, 14 |
| Working Rights | `shared` | 4, 14 |
| Medical Examination | `shared` | 14 |
| Biometrics | `shared` | 14 |
| Healthcare | `country` (CA) | 4, 8, 14 |
| Accommodation | `shared` | 8, 14 |
| Banking | `shared` | 8, 13 (as article link, not URL) |
| Transportation | `shared` | 8, 14 |
| Settlement | `shared` | 14 |
| Family Rights | `shared` | 4, 14 |
| PAL/TAL | `country` (CA) | 2, 14 |
| PGWP | `country` (CA) | 7, 14 |

---

## 2. Validation Report

| Element | Status | Explanation |
|---------|--------|-------------|
| Overview (§1) | **Fully Supported** | Structured section block + counselling objective + classification metadata |
| Eligibility Summary (§2) | **Fully Supported** | Table in structured JSON; official rows via source refs; related via internal links |
| Cost Planning (§3) | **Fully Supported** | Section body + Budget Planner download + IRCC refs; tuition excluded (Fee Master external ref) |
| Family Guide (§4) | **Fully Supported** | Structured section + provincial/IRCC refs + internal links |
| Future Link Services (§5) | **Fully Supported** | Services table in structured JSON; Institution/Fee Master via `external_module_refs` |
| Counselling Journey (§6) | **Fully Supported** | 17-stage table in structured JSON + Meeting Checklist download |
| Future Applications (§7) | **Fully Supported** | Pathway diagram (markdown/structured) + PGWP internal link |
| Settlement Guide (§8) | **Fully Supported** | Section table + Settlement Planner download + article/source refs |
| Common Mistakes (§9) | **Fully Supported** | Numbered list in structured section |
| FAQs (§10) | **Fully Supported** | `kc_faq_items` (25 rows); link-only answers reference registry chips |
| Quiz (§11) | **Fully Supported** | `kc_quiz_questions` with `level` 1–3; answers in `explanation` or Phase 6 training keys |
| Downloads (§12) | **Fully Supported** | Six `kc_download_assets` rows; packing list via `other` + `metadata.subtype` |
| Official Resources (§13) | **Fully Supported** | Master registry + version refs; article-type resources via internal links (not fake URLs) |
| Related Knowledge (§14) | **Fully Supported** | `kc_internal_links` — no content duplication |
| Counselling Objectives | **Fully Supported** | Per-section field in structured `content_body` |
| Content Classification | **Fully Supported** | Per-section `content_classification` array in structured JSON |
| CER progress | **Fully Supported** | `client_education_records` with optional `metadata.section_key` |
| Version header (v1.0 · Updated) | **Fully Supported** | `version_label`, `published_at` on version |
| Institution Master link | **Partially Supported** | Not KC content; routable via `metadata.external_module_refs` — **config only** |
| Fee Master link | **Partially Supported** | Same external module ref pattern |
| Document Library link (FAQ 18) | **Partially Supported** | External module ref to CRM Documents module — **config only** |
| Quiz answer keys (Training Library) | **Partially Supported** | Stored in `explanation` field now; dedicated Team Profile storage Phase 6 |
| Per-section CER | **Partially Supported** | Same `kc_article_id` + `metadata.section_key` — **metadata only** |
| Multilingual content | **Not Supported** (future) | No `locale` column in approved schema; extensible via metadata (see §8) |

**Summary:** 22 Fully Supported · 5 Partially Supported (configuration/metadata, no redesign) · 1 Not Supported (multilingual — post-Phase 1 extension)

---

## 3. Gap Analysis

No architectural redesign. Proposed **minor additions** (fit within existing tables):

| Gap | Proposed addition | Table / field | Type |
|-----|-------------------|---------------|------|
| 14-section guide template order | `guide_sections` manifest | `kc_articles.metadata` | JSON array: `{ id, order, title, type: narrative\|faq\|quiz\|downloads\|sources\|related }` |
| Structured section schema | Section blocks with purpose, objective, classification | `kc_article_versions.content_body` | JSON when `content_format=structured` |
| Counselling objective per section | `counselling_objective` on section block | `content_body.sections[]` | JSON field |
| Content classification chips | `content_classification[]` | `content_body.sections[]` or section `metadata` | JSON enum array |
| Journey stage on downloads | `journey_stage` (1–17 or label) | `kc_download_assets.metadata` | JSON |
| Packing list category | `subtype: packing_list` | `kc_download_assets.metadata` | JSON (enum stays `other`) |
| External CRM module links | `external_module_refs[]` | `kc_articles.metadata` or section block | `{ module, route, label }` |
| Per-section CER | `section_key` | `client_education_records.metadata` | text |
| FAQ cross-service reuse | `source_article_id` optional | `kc_faq_items.metadata` | UUID (optional, per guide Recommendations) |
| Official source “Reason” column | `reason` text | `kc_official_sources.metadata` or `kc_article_source_refs.anchor_label` | text (anchor_label already exists) |
| Quiz answer keys (interim) | Full answer text | `kc_quiz_questions.explanation` | text until Phase 6 |

**Not required for Canada guide:** new tables, new business modules, or Canada-specific schema.

---

## 4. Normalization Review (SSOT)

| Domain | SSOT location | Duplication risk | Verdict |
|--------|---------------|------------------|---------|
| **Official Resources** | `kc_official_sources` (UNIQUE `official_url`) | Articles use `kc_article_source_refs` only | ✓ SSOT — update URL once in registry |
| **Downloads** | `kc_download_assets` + `kc-downloads` bucket | One row per template version; no copies in article body | ✓ SSOT |
| **FAQs** | `kc_faq_items` per version | FAQ Library aggregates; no FAQ text in CER or client | ✓ SSOT; optional FAQ reuse via metadata |
| **Quiz** | `kc_quiz_questions` per version | Questions not in markdown body | ✓ SSOT |
| **Related Knowledge** | Target `kc_articles` + `kc_internal_links` | Section 14 lists links only; deep content in target article | ✓ SSOT |
| **Knowledge Topics** | `kc_articles` + `current_version_id` | One master guide per service; shared articles once | ✓ SSOT |
| **Versioning** | `kc_article_versions` immutable | Published bodies never overwritten | ✓ SSOT |
| **Client progress** | `client_education_records` | No KC body in client tables | ✓ SSOT |
| **Tuition / fees figures** | Fee Master (CRM) | Cost Planning links, does not store tuition | ✓ Correct ownership |
| **Institution data** | Institution Master (`upi_*`) | Journey stages link, do not copy | ✓ Correct ownership |

**Unnecessary duplication avoided:** Official facts in registry; counselling narrative in version body; satellites version-scoped; related articles single-owned.

---

## 5. Extensibility Review

Adding new country/service guides requires **data + content only** (no Canada-specific code):

| New guide | Data actions | Code required? |
|-----------|--------------|----------------|
| UK Student Visa | New `service_library` row (if missing); `kc_articles` + versions; `kc_article_countries` (GB); FAQs/quiz/downloads/sources/links | **No** — same `guide_sections` manifest pattern |
| Australia Student Visa | Same pattern (AU + service id) | **No** |
| USA Student Visa | Same pattern | **No** |
| Canada Visitor Visa | Same pattern (CA + different service_library id) | **No** |
| Canada PGWP | Same pattern | **No** |
| Canada PR | Same pattern | **No** |

**Generic UI components** (one implementation serves all):

- `GuideSectionNavigator` — reads `metadata.guide_sections`
- `StructuredSectionRenderer` — renders narrative / FAQ / quiz / downloads / sources / related by `type`
- `OfficialSourceChip`, `InternalLinkPreview`, `DownloadCard`, `FaqAccordion`, `QuizRunner`

**Code would only be required if:**

- A new **section type** beyond the 14 approved types were added (frozen — not allowed)
- A new **satellite table** were needed (not indicated)
- **Multilingual** UI (needs `locale` dimension — future minor schema addition)

---

## 6. CRUD Validation

| Entity | Create | Read | Update | Delete | Archive | Publish |
|--------|:------:|:----:|:------:|:------:|:-------:|:-------:|
| `kc_articles` | Admin/Processing | All staff (published); editors (draft) | Editors (metadata, slug) | Admin | `status=archived` | Via version RPC |
| `kc_article_versions` | Editors (new draft version) | Staff / editors | Draft only | Admin (draft) | Superseded state | `kc_publish_version` |
| `kc_official_sources` | Editors | All staff | Editors | Admin | `status=archived` | N/A (verify = update `last_verified_at`) |
| `kc_article_source_refs` | Editors | Staff | Editors | Editors | Remove ref | With version publish |
| `kc_internal_links` | Editors | Staff | Editors | Editors | Remove link | With version publish |
| `kc_faq_items` | Editors | Staff | Editors (draft version) | Editors | N/A | With version publish |
| `kc_quiz_questions` | Editors | Staff | Editors (draft version) | Editors | N/A | With version publish |
| `kc_download_assets` | Editors (upload) | Staff | Editors (metadata / replace file) | Admin | N/A | With version or global |
| `kc_article_countries` | Editors | Staff | Editors | Editors | N/A | N/A |
| `kc_article_services` | Editors | Staff | Editors | Editors | N/A | N/A |
| `client_education_records` | Counsellor (scoped) | Scoped staff | Notes/ack (scoped) | Admin | `status=cancelled` | N/A |

All operations defined in Functional Specification §7–8; RLS enforces scope.

---

## 7. UI Validation

| Functional Spec screen | Gold Standard mapping | Custom UI needed? |
|------------------------|----------------------|-------------------|
| KC Dashboard | Entry to Canada service / country hubs | **No** — generic tiles |
| Country Page (CA) | Filter to Canada Student Visa master guide | **No** |
| Service Page | Canada Student Visa Outside Canada — 14-section navigator | **No** — generic guide renderer |
| Knowledge Topic reader | Master guide: sections 1–14 in one reader with TOC | **No** — structured + satellite panels |
| Downloads library | Section 12 assets + global filter | **No** |
| Official Sources registry | Section 13 registry rows | **No** |
| Quiz runner | Section 11 levels 1–3 | **No** — existing quiz pattern |
| FAQ browser | Section 10 + cross-service | **No** |
| Client Education tab | Explain per section or whole guide | **No** |
| Search results | Topics, FAQs, related articles | **No** |
| KC Admin | Author all sections + satellites | **No** |
| Mobile view | Same section stack | **No** |

**Canada-specific screens:** None. Canada guide is data instantiated in generic components.

**Section type rendering (generic):**

| Section type | Renderer |
|--------------|----------|
| `narrative` (§1–9) | `StructuredSectionRenderer` — purpose, tables, bullets, objective, classification |
| `faq` (§10) | `FaqAccordion` ← `kc_faq_items` |
| `quiz` (§11) | `QuizRunner` ← `kc_quiz_questions` |
| `downloads` (§12) | `DownloadCard` grid ← `kc_download_assets` |
| `sources` (§13) | `OfficialSourcesTable` / chips ← registry + refs |
| `related` (§14) | `InternalLinkPreview` list ← `kc_internal_links` |

---

## 8. Future Scalability

| Scale target | Comfortable? | Notes / limitations |
|--------------|--------------|---------------------|
| 20+ countries | **Yes** | `kc_article_countries`; country hubs paginated |
| 100+ services | **Yes** | Service hub index; `service_library` already scales |
| 2,000+ knowledge topics | **Yes** | Indexes on `slug`, `kind`, `status`; list pagination required in UI |
| 10,000+ FAQs | **Yes** | Index on `(article_id, version_id)`; FAQ browser must paginate; FTS GIN in Phase 3 |
| 5,000+ downloads | **Yes** | Storage bucket scales; metadata table with indexes |
| 1,000+ quizzes | **Yes** | Questions child of versions; quiz hub filters by service |
| Multilingual | **Not yet** | Requires `locale` on `kc_article_versions` (or parallel articles per locale) — **Recommendations**; not blocking Canada English v1.0 |

**Database limits:** Single Postgres instance handles above with proposed indexes. At 10k+ FAQs consider partial indexes on published versions only.

**CDN:** Download files via Supabase storage + signed URLs — standard pattern.

---

## 9. Final Architecture Verdict

### **APPROVED WITH MINOR CHANGES**

The approved architecture can represent the complete Canada Gold Standard Guide without structural redesign.

**Required minor changes (metadata / configuration only — implement in Phase 1 migration `metadata` defaults + structured content contract):**

1. Document **structured `content_body` schema** for guide sections (sections 1–9) in implementation guide (not a schema migration — uses existing `content_format = structured`).
2. Add **`kc_articles.metadata.guide_sections`** manifest for 14-section order and types.
3. Add **`client_education_records.metadata.section_key`** for per-section CER (optional).
4. Add **`kc_download_assets.metadata.journey_stage`** and **`subtype`** for packing list.
5. Add **`kc_articles.metadata.external_module_refs`** for Institution Master, Fee Master, Document Library.
6. Use **`kc_quiz_questions.explanation`** for answer keys until Phase 6 Team Profile.

**Not blocking Phase 1:** Multilingual dimension (document in Recommendations).

**Do not begin implementation until this validation document is approved.**

---

## 10. Recommendations (outside frozen architecture)

1. **`locale` column** on `kc_article_versions` for multilingual (parallel versions per locale).
2. **`kc_faq_items.metadata.reusable_article_id`** for FAQ Library cross-service aggregation (guide already suggests FAQ ↔ article tagging).
3. **Materialized view** `kc_published_article_search` for sub-100ms search at 10k+ FAQs.
4. **Section-level CER required set** — `kc_required_sections` config table (future reporting) — only if product mandates automated pending counselling per section.
5. **Last verified chip** on Official Source rows in reader (guide Recommendations — display only).

---

## 11. Approval sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Product Owner | | | ☐ |
| Lead Architect | | | ☐ |
| Engineering | | | ☐ |

Upon approval of **Functional Specification v1.0** + **this validation** → proceed to **Phase 1** implementation.

---

*End of Architecture Validation*
