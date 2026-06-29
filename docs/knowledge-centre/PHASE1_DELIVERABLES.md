# Knowledge Centre — Phase 1 Deliverables

**Status:** Complete — awaiting Phase 1 approval before Phase 2  
**Migration:** `20261005120000_knowledge_centre_phase1_foundation.sql`

---

## 1. Migration Summary

Single migration creates:

- 10 `kc_*` tables + junction tables
- RLS helpers `can_view_knowledge_centre`, `can_manage_knowledge_centre`
- RLS policies on all tables
- Storage bucket `kc-downloads` with staff policies
- RPCs: `kc_publish_version`, `kc_resolve_live_article`, `kc_search_articles`
- `updated_at` triggers on core tables

**Apply via:** Lovable → Sync → Publish → approve migration.

---

## 2. Database Schema Summary

| Layer | Tables |
|-------|--------|
| SSOT URLs | `kc_official_sources` |
| Topics | `kc_articles`, `kc_article_versions` |
| Scope | `kc_article_countries`, `kc_article_services` |
| Satellites | `kc_faq_items`, `kc_quiz_questions`, `kc_download_assets`, `kc_article_source_refs`, `kc_internal_links` |
| Reused | `countries`, `service_library`, `auth.users` |

**Metadata (approved):** `guide_sections`, `tags`, `categories`, `external_module_refs`, `estimated_reading_minutes`, `journey_stage`, `subtype` on downloads.

---

## 3. Tables Created

1. `kc_official_sources`
2. `kc_articles`
3. `kc_article_versions`
4. `kc_article_countries`
5. `kc_article_services`
6. `kc_faq_items`
7. `kc_quiz_questions`
8. `kc_download_assets`
9. `kc_article_source_refs`
10. `kc_internal_links`

---

## 4. Components Created

| Component | Purpose |
|-----------|---------|
| `KnowledgeCentreProtectedRoute` | Module + auth guard |
| `KnowledgeGuideReader` | Generic 14-section reader |
| `GuideSectionNavigator` | Section TOC |
| `StructuredSectionPanel` | Narrative sections 1–9 |
| `FaqSectionPanel` | FAQ accordion |
| `QuizSectionPanel` | Self-test quiz |
| `DownloadsSectionPanel` | Download cards |
| `OfficialSourcesSectionPanel` | Registry chips |
| `RelatedKnowledgePanel` | Internal links |
| `KcStatusBadge` / `ArticleVersionBadge` | Status display |
| `KcEmptyState` | Empty states |

---

## 5. Pages Created

| Route | Page |
|-------|------|
| `/knowledge-centre` | Dashboard |
| `/knowledge-centre/countries` | Countries index |
| `/knowledge-centre/countries/:code` | Country hub |
| `/knowledge-centre/articles` | Shared knowledge |
| `/knowledge-centre/articles/:slug` | Topic reader |
| `/knowledge-centre/services` | Services index |
| `/knowledge-centre/services/:libraryId` | Service hub |
| `/knowledge-centre/faqs` | FAQ browser |
| `/knowledge-centre/quiz` | Quiz index |
| `/knowledge-centre/quiz/:slug` | Quiz runner |
| `/knowledge-centre/downloads` | Downloads library |
| `/knowledge-centre/official-sources` | Official resources registry |
| `/knowledge-centre/search` | Search results |
| `/knowledge-centre/admin` | Admin console |
| `/knowledge-centre/admin/articles/:id` | Article editor |

---

## 6. Reused Existing Components

- `AppLayout`, `PageHeader`, `Card`, `Button`, `Input`, `Textarea`, `Tabs`, `Dialog`, `Badge`, `Accordion`
- `useModulePermission`, `InstitutionsProtectedRoute` pattern
- `countries` master, `service_library` catalogue
- Supabase client, toast, shadcn design system

---

## 7. Canada Gold Standard Validation

Every guide element maps without structural code changes:

| Guide element | Representation |
|---------------|----------------|
| Sections 1–9 | `content_body` structured JSON + `GuideSectionNavigator` |
| FAQs | `kc_faq_items` |
| Quiz (3 levels) | `kc_quiz_questions.level` |
| Downloads | `kc_download_assets` + `metadata.journey_stage` |
| Official Resources | `kc_official_sources` + `kc_article_source_refs` |
| Related Knowledge | `kc_internal_links` |
| Counselling objectives | `counselling_objective` on section blocks |
| Content classification | `content_classification[]` on section blocks |
| Institution/Fee Master | `metadata.external_module_refs` |

**No Canada-specific routes or components.**

---

## 8. Import Strategy

- **Format:** JSON (`docs/knowledge-centre/GUIDE_IMPORT_FORMAT.md`)
- **Parser:** `src/knowledge-centre/lib/guideImport.ts`
- **UI:** Admin → Import JSON creates article, version, FAQs, quiz, sources, related links
- **Future guides:** UK/Australia/Germany/USA — same JSON contract, data only

---

## 9. Recommendations (NOT IMPLEMENTED)

- `locale` column on versions for multilingual
- Markdown→JSON import pipeline for Claude guides
- FAQ editor inline (not read-only) in article editor
- Quiz question inline editor
- Full-text GIN index (Phase 3 scope)
- Materialized search view at 10k+ FAQs
- CER, timeline, reports, team learning (later phases)

---

*End of Phase 1 deliverables*
