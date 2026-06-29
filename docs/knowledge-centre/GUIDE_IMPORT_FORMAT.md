# Knowledge Centre — Guide Import JSON Format

Use this format to import Claude-generated country/service guides via **Knowledge Centre Admin → Import JSON**.

## Minimal example

```json
{
  "slug": "canada-student-visa-outside-canada",
  "title": "Canada – Student Visa (Outside Canada)",
  "article_kind": "service",
  "version_label": "1.0.0",
  "country_codes": ["CA"],
  "service_library_ids": ["<service_library uuid>"],
  "tags": ["student", "canada", "visa"],
  "categories": ["visa", "counselling"],
  "estimated_reading_minutes": 45,
  "external_module_refs": [
    { "module": "institutions", "route": "/institutions", "label": "Institution Master" },
    { "module": "fee_master", "route": "/masters", "label": "Fee Master" }
  ],
  "narrative_sections": [
    {
      "id": "overview",
      "title": "Overview",
      "purpose": "Orient counsellor and client",
      "counselling_objective": "Client understands service scope",
      "content_classification": ["future_link", "official_reference"],
      "body_md": "Counsellor guidance text…"
    }
  ],
  "faqs": [
    { "question": "Can Future Link guarantee a visa?", "answer": "No — IRCC decides.", "sort_order": 1 }
  ],
  "quiz": [
    {
      "question": "Who issues the study permit?",
      "options": ["Future Link", "IRCC", "DLI"],
      "correct_index": 1,
      "explanation": "IRCC approves; permit at POE.",
      "level": 1,
      "sort_order": 1
    }
  ],
  "downloads": [
    {
      "title": "Budget Planner",
      "download_type": "budget_planner",
      "journey_stage": "3",
      "sort_order": 1
    }
  ],
  "official_sources": [
    {
      "category": "Immigration",
      "authority": "IRCC",
      "title": "Study permit",
      "official_url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html",
      "country_code": "CA",
      "reason": "Core authority"
    }
  ],
  "related_article_slugs": ["proof-of-funds", "pgwp-canada"]
}
```

## Field reference

| Field | Required | Notes |
|-------|----------|-------|
| `slug` | Yes | Stable URL key |
| `title` | Yes | Display title |
| `article_kind` | No | `service`, `shared`, `country` (default `service`) |
| `guide_sections` | No | Defaults to 14-section Gold Standard manifest |
| `narrative_sections` | No | Sections 1–9 content blocks |
| `faqs` | No | Section 10 |
| `quiz` | No | Section 11; `level` 1–3 = Beginner/Intermediate/Advanced |
| `downloads` | No | Metadata only until files uploaded in editor |
| `official_sources` | No | Creates registry rows + version refs |
| `related_article_slugs` | No | Links to existing articles by slug |

## Canada Gold Standard

Import the narrative/FAQ/quiz/source structure from the gold standard guide markdown into this JSON (or use a future markdown→JSON converter). The platform renders all 14 section **types** generically — no Canada-specific code.
