## Problems

1. **Mirror composition loses the reference's main content.** When a user attaches an IBU poster with role `layout` ("mirror composition"), the edge function prompt currently says *"mirror its composition and grid; replace ALL text with the Brief above"* AND also says *"Do NOT draw, invent or imagine ANY university / institution / college logo, crest, shield, monogram, wordmark"* (because no `institution_logo` ref is attached). The combined effect is that IBU's name, "International Business University" wordmark, building, DLI line, etc. all disappear — the model is explicitly forbidden from reproducing them.

2. **No way to delete generated images.** The grid and the "Recent generations" panel only have Download / Enhance / Save. Junk variants pile up in storage and clutter the UI.

## Fix

### 1. New reference role `blueprint` (full content mirror)

`usePromoStudio.ts` — extend `RefRole` union with `"blueprint"`.

`ReferenceTray.tsx` — add label *"Blueprint (mirror layout AND keep institution name/logo/imagery)"*.

`dsh-ai-generate-poster/index.ts`:
- Detect `hasBlueprint = refs.some(r => r.role === "blueprint")`.
- When `hasBlueprint` is true:
  - Suppress the "do NOT draw any institution logo" rule (the institution logo/wordmark/landmark in the blueprint reference is the source of truth).
  - Append a strong instruction for that ref: *"Reference image #N: BLUEPRINT — use as master template. Preserve VERBATIM: the institution name, official wordmark/logo, building/landmark photography, color scheme, DLI/identifier lines, section structure. Only refresh: intake date, highlights bullets, and the contact footer per the Brief above. Do NOT replace the institution name with the Brief's `institution_name` unless that field is non-empty."*
- Tighten the existing `layout` role wording so it stops saying "replace ALL text" — change to "mirror composition; refresh copy per Brief but keep any visible institution wordmark/landmark."

### 2. Delete generated images

`usePromoStudio.ts` — add:
```ts
async function deleteGeneration(id: string, paths: string[]) {
  if (paths?.length) await supabase.storage.from("dsh-media").remove(paths).catch(() => {});
  const { error } = await supabase.from("dsh_ai_generations").delete().eq("id", id);
  if (error) throw error;
}
async function deleteGeneratedImage(path: string) {
  await supabase.storage.from("dsh-media").remove([path]).catch(() => {});
  // also strip from any dsh_ai_generations.image_paths array row
  const { data } = await supabase.from("dsh_ai_generations").select("id,image_paths").contains("image_paths", [path]);
  for (const row of data ?? []) {
    const next = (row.image_paths as string[]).filter((p) => p !== path);
    if (next.length === 0) await supabase.from("dsh_ai_generations").delete().eq("id", row.id);
    else await supabase.from("dsh_ai_generations").update({ image_paths: next }).eq("id", row.id);
  }
}
```

`AiStudioPage.tsx`:
- In the current-batch grid (lines 290–312): add a small destructive Trash button per card. On click → confirm, call `deleteGeneratedImage(path)`, remove from local `images` state, toast, refresh recent.
- In `RecentGenerationsPanel`: add per-image Trash button (calls `deleteGeneratedImage`) and a "Delete all" button on each generation row header (calls `deleteGeneration(r.id, r.image_paths)`), then `onRefresh()`.

### Out of scope
- Trash/undo (hard delete only, with confirm dialog).
- Bulk multi-select across rows.
- Cross-user delete protection — RLS already restricts to user's own rows.

### Files to touch
- `supabase/functions/dsh-ai-generate-poster/index.ts`
- `src/digital-success/ai/usePromoStudio.ts`
- `src/digital-success/ai/ReferenceTray.tsx`
- `src/digital-success/ai/AiStudioPage.tsx`
