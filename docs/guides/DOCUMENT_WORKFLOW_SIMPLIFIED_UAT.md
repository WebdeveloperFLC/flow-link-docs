# Document Workflow — Simplified UAT

> **Architecture:** [`DOCUMENT_MANAGEMENT_ARCHITECTURE.md`](./DOCUMENT_MANAGEMENT_ARCHITECTURE.md) (locked)
> **Screenshot folder:** `uat-screenshots/document-workflow/`

Run after Lovable Publish + hard refresh.

---

## Pass criteria — Documents tab (upload section)

### A. Upload rows are uploadable documents only

Open a client with an **existing legacy service** (e.g. Australia Student Visa) and a **new Canada Spouse pilot case**.

| # | Check | Pass |
|---|-------|------|
| A1 | Documents tab shows passport, marriage certificate, financial documents, etc. | ☐ |
| A2 | **No** eligibility rows (e.g. Genuine Student requirement, Financial capacity) | ☐ |
| A3 | **No** red-flag rows (e.g. Weak GS statement, CoE/provider issues) | ☐ |
| A4 | **No** compliance/assessment rows (e.g. Client is physically in Canada) | ☐ |
| A5 | **No** checklist/milestone rows (fee paid, QA sign-off, application lodged) | ☐ |

### B. Default + manual documents only

| # | Check | Pass |
|---|-------|------|
| B1 | Default rows come from service template / manifest (upload codes) | ☐ |
| B2 | **No** “Suggested Documents” auto-added section | ☐ |
| B3 | Add Document opens catalogue picker (alphabetical by category) | ☐ |
| B4 | Add Document header says catalogue picker — **not** “Relevance: Student visa” | ☐ |
| B5 | Manual add creates a new upload row on Documents tab | ☐ |

### C. Canada Spouse pilot (new case)

| # | Check | Pass |
|---|-------|------|
| C1 | New case shows ~8 upload rows (passport, photograph, marriage cert, etc.) | ☐ |
| C2 | No eligibility/red-flag pseudo-rows | ☐ |
| C3 | Progress summary counts only uploadable rows | ☐ |

---

## Screenshots to capture

Save as `uat-screenshots/document-workflow/DW-UAT-{ID}_{YYYYMMDD}.png`

| ID | Screen | What to show |
|----|--------|--------------|
| **DW-UAT-01** | Documents tab — full upload section | Progress bar + section accordion with **only** file upload rows |
| **DW-UAT-02** | Documents tab — missing chips | Missing Required chips; none reference eligibility/red flags |
| **DW-UAT-03** | Add Document dialog | Catalogue picker header + category groups (alphabetical) |
| **DW-UAT-04** | Add Document — after manual add | New row visible in Section + Flat views |
| **DW-UAT-05** | Legacy student case (negative) | Confirm GS / financial capacity rows **absent** |
| **DW-UAT-06** | Canada Spouse new case | Pilot default documents only |

---

## Automated checks

```bash
npx vitest run src/lib/documentWorkflow/uploadableRequirements.test.ts
```

---

## Known limitations (not blockers)

| Item | Status |
|------|--------|
| Binder collections + OUTDATED/rebuild | Not implemented — legacy PDF merge UI |
| Submission package entity | Not implemented |
| Phase B catalogue expansion | Deferred |
| Fleet conversion | Blocked |
