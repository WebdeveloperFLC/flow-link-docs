# Repository Cleanup Plan

**Repository:** flow-link-docs  
**Based on:** REPOSITORY_SIZE_REPORT.md audit (2026-06-19)  
**Policy:** No files deleted as part of this plan document — execute manually or via Agent mode.

---

## Summary

| Category | Est. savings | Risk |
|----------|--------------|------|
| Safe to delete (regenerable) | ~102 MB | Low |
| Safe to archive (move off-repo) | ~56 MB | Low–medium |
| Must keep | — | N/A |

**Total potential disk reduction:** ~**158 MB** (excludes `node_modules` / `.git`, which should stay locally but are already gitignored).

---

## Safe to delete

Regenerable artifacts. Deleting does **not** affect the running app (Lovable/Vite/Supabase).

| Path | Size | Why safe | How to regenerate |
|------|------|----------|-------------------|
| `.zip-staging-service-library/` | ~60 MB | Stale zip-build staging; not used at runtime | `node scripts/build-service-library-full-zip.mjs` |
| `.zip-staging-b5/` | ~176 KB | Phase zip staging leftover | `node scripts/create-phase-zips.mjs` |
| `.zip-staging-c/` | ~284 KB | Phase zip staging leftover | `node scripts/create-phase-zips.mjs` |
| `.zip-staging-d/` | ~60 KB | Phase zip staging leftover | `node scripts/create-phase-ed-zips.mjs` |
| `.zip-staging-e/` | ~136 KB | Phase zip staging leftover | `node scripts/create-phase-ed-zips.mjs` |
| `dist/` | ~41 MB | Vite build output (in `.gitignore`) | `npm run build` |
| `docs/guides/FLC_CMS_Cursor_Package/FLC_CMS_Cursor_Package.zip` | ~18 MB | Duplicate of extracted package beside it | Re-zip from folder if needed |

**Subtotal safe to delete:** ~**102 MB**

### Suggested delete commands (run only after backup / confirmation)

```bash
rm -rf .zip-staging-service-library .zip-staging-b5 .zip-staging-c .zip-staging-d .zip-staging-e
rm -rf dist
rm -f docs/guides/FLC_CMS_Cursor_Package/FLC_CMS_Cursor_Package.zip
```

---

## Safe to archive

Move to external storage (Drive, S3, local `~/archives/flow-link-docs/`) — not needed for day-to-day dev or Lovable publish.

| Path | Size | Why archive | Keep in repo? |
|------|------|-------------|--------------|
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/` | ~19 MB | Reference PNGs for CMS prototype | Optional — UAT/reference only |
| `docs/guides/FLC_CMS_Cursor_Package/03_Prototype/` | (in 37 MB package) | Static HTML prototype | Optional |
| `review-bundles/` | ~1.2 MB | Phase audit markdown + screenshots | Optional after phase sign-off |
| `guides/screenshots of upload docs section/` | ~7 PNGs | UX reference screenshots | Optional |
| Root `*.zip` exports if present | varies | `service-library-full.zip`, `phase-*-source-code.zip`, etc. | No — regenerate from scripts |
| `reports/service-library-audit-latest.json` | ~398 KB | Generated audit output | Regenerate via audit scripts |

**Subtotal safe to archive:** ~**56 MB** (mostly FLC screenshots + prototype assets)

---

## Must keep

Required for application, migrations, Lovable sync, and agent work.

| Path | Size | Reason |
|------|------|--------|
| `src/` | ~14 MB | Application source |
| `supabase/migrations/` | ~29 MB | Database schema + seeds (production) |
| `supabase/functions/` | ~1.3 MB | Edge functions |
| `content/service-library/` | ~14 MB | Canonical service metadata JSON |
| `public/specimens/` | ~18 MB | Runtime static assets (checklists, PDFs) |
| `scripts/` | ~1.2 MB | Ship, zip builders, audits (includes zip-staging **scripts**) |
| `package.json`, `package-lock.json` | ~374 KB | Dependencies |
| `docs/guides/*.md` (excluding large binary trees) | varies | UAT guides, implementation docs |
| `qa/` | ~160 KB | Regression tests |
| `.cursor/rules/` | small | Agent workflow rules |
| `node_modules/` | ~589 MB | Local dev (gitignored; do not commit) |
| `.git/` | ~95 MB | Version history |

### Do not delete (even though large)

- `supabase/migrations/*seed*.sql` — required for Lovable migration publish
- `content/service-library/bulk-upload.json` — source data (staging copy is duplicate)
- `src/integrations/supabase/types.ts` — generated types, used by app

---

## Estimated size savings

| Action | Savings | Cursor indexing benefit |
|--------|---------|-------------------------|
| Delete all `.zip-staging*/` | ~61 MB | High — removes duplicate migrations/content |
| Delete `dist/` | ~41 MB | High — build artifacts |
| Delete nested `FLC_CMS_Cursor_Package.zip` | ~18 MB | Medium |
| Archive FLC screenshots + prototype | ~37 MB | High if excluded via `.cursorignore` |
| Add `.cursorignore` (no delete) | 0 MB disk | **High** — skips ~700+ MB from agent context |
| Delete `node_modules` + reinstall | ~589 MB disk | N/A — reinstall with `npm ci` |

**Disk cleanup (delete + archive):** ~**158 MB**  
**Cursor token savings (`.cursorignore`):** primarily `node_modules` + staging + `dist` + binaries (~**650+ MB** not indexed)

---

## `.zip-staging` reference audit

| Question | Answer |
|----------|--------|
| Used by Vite / React app at runtime? | **No** |
| Imported from `src/`? | **No** |
| Referenced in `package.json` scripts? | **No** (only standalone `node scripts/...` utilities) |
| Used by `scripts/ship.sh` or `npm run ship`? | **No** |
| Purpose | Temporary directories for building review/export zips |

Scripts that use staging dirs:

- `scripts/build-service-library-full-zip.mjs` → `.zip-staging-service-library`
- `scripts/create-phase-zips.mjs` → `.zip-staging-b5`, `.zip-staging-c`
- `scripts/create-phase-ed-zips.mjs` → `.zip-staging-d`, `.zip-staging-e`
- `scripts/build-accounting-full-zip.mjs` → `.zip-staging-accounting-full`
- `scripts/build-commission-module-zip.mjs` → `.zip-staging-commission-module`
- `scripts/build-coursefinder-institutions-zip.mjs` → `.zip-staging-coursefinder-institutions`

---

## Recommended execution order

1. **Add `.cursorignore`** (no deletions) — immediate Cursor token benefit  
2. **Delete `.zip-staging*/`** — largest low-risk disk win (~61 MB)  
3. **Delete `dist/`** if not actively previewing locally  
4. **Delete nested FLC `.zip`** if extracted folder is kept  
5. **Archive** FLC screenshots / review-bundles when phases are signed off  
6. **Do not** delete `public/specimens/`, `content/`, or `supabase/migrations/`

---

## Not in scope

- Removing `node_modules` (reinstall only when needed)
- Rewriting git history to shrink `.git`
- Deleting committed migration files
