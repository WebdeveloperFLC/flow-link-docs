# Service Library — sample specimens

## Document checklists (all countries)

**Index:** [checklists/index.html](./checklists/index.html)

Each checklist includes the **Future Link Consultants logo** (embedded PNG — prints reliably to PDF).

| File | Notes |
|------|--------|
| `checklists/canada-student-visa.html` | Full 30-item Claude-style checklist (PAL/TAL, PGWP, etc.) |
| `checklists/*.html` | Auto-built for all 36 visa services |

**Regenerate all:**

```bash
node scripts/generate-all-service-checklist-specimens.mjs
```

**Preview:** `npm run dev` → use the port Vite prints (e.g. `http://localhost:8083/specimens/checklists/`)

After changing `vite.config.ts`, restart the dev server once so checklist paths work without `.html`.

**Print to PDF:** Open any HTML → Print → Save as PDF (same as Claude checklist workflow).

---

## Legacy files

| File | Purpose |
|------|---------|
| `Study Permit Checklist — Future Link Consultants.pdf` | Your Claude-printed PDF (reference) |
| `canada-student-visa-outside-canada-checklist.html` | Synced copy of Canada student HTML |
| `flc-logo.png` | Logo asset |

## Canada Student Visa — compact PDF (optional)

```bash
node scripts/generate-canada-student-checklist-pdf.mjs
```
