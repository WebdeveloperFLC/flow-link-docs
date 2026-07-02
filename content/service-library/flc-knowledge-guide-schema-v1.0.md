# FLC Knowledge Centre — Guide JSON Schema Specification
**Version 1.0 · 29 Jun 2026 · Baseline: Canada – Student Visa (Outside Canada)**

This document defines the governing schema for every service guide in the Future Link Knowledge Centre.
Canada – Student Visa (Outside Canada) is the **reference implementation**. Every future country/service
guide MUST validate against this schema. Extensions require explicit approval and a version bump.

---

## 1. Core principles (non-negotiable)
1. **Consistent shell.** Every guide renders the same outer layout: breadcrumb → title → KPI tiles →
   policy alert → processing bar → navigation → panels → footer. Same design language everywhere.
2. **Data-driven navigation.** The `navigation` array declares which sections render, in order. The
   renderer builds tabs ONLY from this array. Omitting an entry means that tab does not exist for the service.
3. **Two applicability states.** A section is either present (in `navigation`) or omitted. There is no
   "disabled" state. Flags ("Not Allowed/Eligible/Applicable") are handled case-by-case via `flagStatus`
   on the section's data — used ONLY where the absence would mislead (legal/counselling clarification).
4. **Ownership.** Future Link owns counselling content. Government facts are LINKED via source IDs,
   never copied. Every official figure carries a `sourceRefs` chip resolving to the `sources` registry.
5. **Currency.** Cost amounts stored in CAD (`cadAmount`); INR auto-computed from the CRM Currency Master
   via `currencyConfig`. No hardcoded FX.

---

## 2. Top-level fields

| Field | Type | Mandatory | Notes |
|---|---|---|---|
| `schemaVersion` | string | YES | Must be "1.0". Validation target. |
| `schemaRef` | string | YES | "flc-knowledge-guide-schema-v1.0" |
| `slug` | string | YES | URL-safe unique id, e.g. "canada-student-visa-outside-canada" |
| `displayName` | string | YES | Full guide title |
| `shortDescription` | string | YES | One-line summary under the title |
| `country` | string | YES | Country name (breadcrumb) |
| `service` | string | YES | Service name (breadcrumb) |
| `navBucket` | string | YES | "visa" \| "work" \| "pr" \| "visitor" … |
| `version` | string | YES | Content version, e.g. "v3.0" |
| `versionStatus` | enum | YES | "Live" \| "Draft" \| "Archived" |
| `reviewStatus` | string | YES | "active" \| "review" |
| `updatedLabel` | string | YES | "Updated DD Mon YYYY" |
| `builtToStandard` | string | YES | "Knowledge Writing Standard v1.0" |
| `learningLevel` | string | optional | "Beginner/Intermediate/Advanced" |
| `learningMinutes` | int | optional | Est. read time |
| `sourcePolicy` | string | YES | The "facts linked not copied" statement |
| `policyAlert` | object | YES | `{active, date, summary, sourceRefs[]}` |
| `kpis` | array | YES | 4–6 KPI tiles (see §4) |
| `chips` | array | optional | Overview quick chips `{label, variant}` |
| `navigation` | array | YES | Ordered section descriptors (see §3) |
| `navigationModel` | object | YES | Documents the applicability model |
| `currencyConfig` | object | YES (if costs) | Auto-FX config (see §5) |
| `sources` | array | YES | Source registry S1..Sn (see §6) |
| `versionControl` | object | YES | `{version,lastReviewed,nextReview,reviewedBy,governmentSource,confidence}` |
| `changelog` | array | YES | Version history entries |
| Section data keys | object/array | conditional | One per navigation `dataKey` that is present |

---

## 3. `navigation` array — the heart of the schema
Each entry:
```json
{ "key": "working", "label": "Working Rights", "sectionType": "working-rights",
  "dataKey": "workingRights", "applicable": true }
```
| Field | Mandatory | Notes |
|---|---|---|
| `key` | YES | Unique tab id (CSS + anchor) |
| `label` | YES | Tab text shown to user |
| `sectionType` | YES | One of the supported types in §7 (controls rendering) |
| `dataKey` | YES | Top-level key where this section's content lives |
| `applicable` | YES | Always true when present. To remove a section, omit the entry entirely. |

**Rule:** the renderer iterates `navigation` in order and renders each section. No hardcoded tab list.

---

## 4. `kpis`
4–6 tiles. Each: `{label, value, sub, tone, sourceRefs[]}`.
`tone` ∈ {primary, warning, violet, success}. Any KPI carrying an official figure MUST have `sourceRefs`.
Omit a KPI (e.g. approval-rate) rather than show unverified data.

---

## 5. `currencyConfig` (mandatory when the guide has costs)
```json
{ "baseCurrency":"CAD", "displayCurrency":"INR", "source":"Currency Master",
  "autoFetch":true, "rateField":"effectiveRate", "fallbackRate":69.59,
  "fallbackAsOf":"29 Jun 2026", "note":"…" }
```
Cost items store `cadAmount` (number or [lo,hi]); `inr` is set to "auto". The CRM substitutes the live
Currency Master rate at render. The `fallbackRate` is used only if the Master is unavailable.

---

## 6. `sources` registry
Array of `{id, authority, page, category, url, reason}`. `id` is "S1","S2",… Referenced everywhere via
`sourceRefs: [{id, url}]`. Every official claim in any section MUST cite at least one source id.
URLs MUST be official government domains.

---

## 7. Supported `sectionType` values (rendering contract)
| sectionType | dataKey shape | Renders as |
|---|---|---|
| `overview` | `about[]` + `chips[]` | Cards + chip row |
| `criteria-list` | `eligibility[]` of `{criterion,met,note}` | Checklist with met badges |
| `cost-breakdown` | `fullCostBreakdown{}` | Cost tables + auto-INR + totals + verify link |
| `checklist` | `{note, items[], sourceRefs[]}` | Tick list |
| `document-binder` | `documentBinder{categories[]}` | Suggested-docs by category (○ markers) |
| `forms-table` | `visaForms{forms[]}` | Official forms table with links |
| `timeline` | `timeline[]` of `{title,weeks}` | Numbered process steps |
| `working-rights` | `workingRights{applicant,spouse}` | Cards with hours/details/restrictions/source |
| `dos-donts` | `donts{dos,donts,mistakes}` | Three cards |
| `red-flags` | `redFlags[]` of `{title,severity,body}` | Severity-badged cards |
| `faqs` | `faqs[]` of `{q,a}` | Expandable Q&A |
| `list` | array | Simple checklist (e.g. compliance) |
| `downloads` | `downloads{templates[]}` | Template cards (inline content + Free Guide) |
| `sample-docs` | `sampleDocs{items[]}` | Anonymised sample cards |
| `quiz` | `quiz[]` of `{q,level}` | 3-level columns |
| `related` | `relatedServices[]` | Related-guide cards |
| `sources` | `sources[]` | Source registry table |

A new sectionType requires a schema extension (approval + version bump).

---

## 8. `flagStatus` convention (case-by-case Not Allowed/Eligible/Applicable)
Where a section's ABSENCE could mislead, KEEP the section and set its data object to:
```json
{ "flagStatus": "Not Allowed", "flagReason": "Visitor status does not permit work in Canada." }
```
`flagStatus` ∈ {"Not Allowed","Not Eligible","Not Applicable"}. The renderer shows a status panel
instead of normal content. If there is NO risk of misunderstanding, OMIT the section entirely instead.

**Examples:**
- Visitor Visa → Working Rights → keep with `flagStatus:"Not Allowed"` (important).
- Visitor Visa → Admission → omit from `navigation` (irrelevant).

---

## 9. Validation rules
1. `schemaVersion` == "1.0".
2. Every `navigation[].dataKey` (when not a flagStatus stub) MUST have matching top-level data.
3. Every `sectionType` MUST be in the §7 supported list.
4. Every official figure (KPIs, cost, forms, working rights, policy alert) MUST carry `sourceRefs`.
5. All source URLs MUST be official government domains.
6. If any cost section exists, `currencyConfig` MUST be present and cost items MUST use `cadAmount` + `inr:"auto"`.
7. No raw HTML or scripts in content fields (text only; renderer handles markup).
8. `flagStatus`, when used, MUST include `flagReason`.
9. Approval-rate / performance KPIs MUST be omitted unless backed by verified internal data.

---

## 10. Governance
- Canada – Student Visa (Outside Canada) is the **baseline**. Validate every new guide against it.
- Any deviation from this schema requires explicit approval and a `schemaVersion` bump (e.g. 1.1).
- The Knowledge Writing Standard v1.0 governs editorial tone/quality; this schema governs structure/data.
