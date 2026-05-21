## Approved scope + logo seeding

Same as the previously approved plan, with one addition: the uploaded `FLC_logo_1_-01-6.png` is saved as the default Future Link logo in the new Brand Library so it auto-attaches to every generation.

## Changes

### 1. Seed the Future Link logo
- Copy `user-uploads://FLC_logo_1_-01-6.png` → `src/assets/flc-logo.png`.
- On first load of the Brand Library, if no asset with `kind='logo'` and `is_default_brand=true` exists for the workspace, auto-upload `flc-logo.png` to `dsh-media` bucket at `brand/logos/flc-default.png` and insert a `dsh_brand_assets` row (title: "Future Link Consultants", `is_default_brand=true`). Idempotent.
- When `use_brand` is on, the default logo is added automatically as a `role=logo` reference on every poster request.

### 2. New table `dsh_brand_assets`
Columns: `kind` ('logo' | 'reference'), `title`, `tags text[]`, `storage_path`, `institution_id?`, `country?`, `is_default_brand bool`, `uploaded_by`. RLS: authenticated read; insert/update/delete by owner or admin.

### 3. Multi-reference UI (`ReferenceTray`)
- Up to **4 reference images** per generation, drag/paste/file-pick, plus "Pick from Library" modal.
- Each tile: thumbnail + role selector (`style`, `layout`, `subject`, `logo`, `edit_base`) + remove.
- Separate "Logos" strip showing default Future Link logo (pre-attached, removable) and "+ Add partner logo" from library.

### 4. Brand Library panel (`BrandLibraryPanel`)
- Two tabs: Logos / References.
- Upload, rename, tag, delete, "Set as default Future Link logo".
- Stored in existing `dsh-media` bucket under `brand/logos/*` and `brand/refs/*`.

### 5. Backend prompt fidelity
- `dsh-ai-generate-poster`: accept `references: [{ data_url, role }]`. Build a multimodal user message where each image is preceded by a role-specific text block:
  - `style` → "match palette/typography/composition; do not copy text"
  - `layout` → "mirror composition; replace text per brief"
  - `subject` → "use this person/landmark"
  - `logo` → **"Place this logo VERBATIM at top-right (~12% width). Do NOT redraw, recolor, or re-letter it. Preserve exact glyphs and proportions."**
- When a `logo` reference is present, strip the "draw the Future Link wordmark" line from `BRAND_DEFAULT` (this is what causes the wrong-logo hallucination).
- `dsh-ai-edit-image`: accept `image_data_urls[]` (first = edit base, rest = role-labeled refs); keep single-image backwards compatibility.
- Improve error surfacing: include `finish_reason` and any text reply in `errors[]`.

### 6. `usePromoStudio.ts`
- `PosterBrief.references: { data_url, role, source, asset_id? }[]` (replaces old single-reference fields).
- `generatePoster` routes to edit endpoint if any ref has `role='edit_base'`.
- New helpers: `listBrandAssets`, `uploadBrandAsset`, `deleteBrandAsset`, `setDefaultLogo`, `ensureDefaultLogo` (the seeding routine).
- Resize each ref to max 1536px; warn if total payload >6MB.

## Files touched

- `supabase/migrations/<new>.sql` — `dsh_brand_assets` + RLS
- `src/assets/flc-logo.png` — seeded asset (copied from upload)
- `src/digital-success/ai/AiStudioPage.tsx` — wire ReferenceTray + Brand Library tab
- `src/digital-success/ai/usePromoStudio.ts` — references[] shape, library CRUD, seed default logo
- `src/digital-success/ai/ReferenceTray.tsx` — new
- `src/digital-success/ai/BrandLibraryPanel.tsx` — new
- `supabase/functions/dsh-ai-generate-poster/index.ts` — multi-ref + verbatim-logo prompt
- `supabase/functions/dsh-ai-edit-image/index.ts` — accept multiple images

## Out of scope
- Per-branch ACLs on the library (workspace-wide for v1).
- Auto background removal for logos (upload a clean PNG).