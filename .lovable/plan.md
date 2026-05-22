# Add a "Saved Hub" tab inside AI Studio

## Problem
- The "Save to Hub" button works, but there is no visible Hub anywhere inside the AI Studio section, so users can't see what they've saved.
- Users want a dedicated space where every saved AI asset (poster, stock image, video clip) lives, viewable without leaving the Studio.

## Solution
Add a new **Saved Hub** tab in `AiStudioPage.tsx` (next to Brand Library) that lists every `dsh_media` row the current user has uploaded from AI Studio, with thumbnail, title, type, date, and actions (Open, Download, Delete).

### UI changes — `src/digital-success/ai/AiStudioPage.tsx`
- Add a new `<TabsTrigger value="hub">` with a `Bookmark`/`FolderOpen` icon labelled **"Saved Hub"**.
- Add a `<TabsContent value="hub">` that renders a new `SavedHubPanel` component.
- Also surface a small banner/link at the top of the Studio: *"View your saved assets →"* that switches to the Hub tab (helps discoverability).

### New component — `src/digital-success/ai/SavedHubPanel.tsx`
- On mount, query `dsh_media` filtered by `uploaded_by = auth.uid()` ordered by `created_at desc` (limit 100).
- For each row: signed URL from `dsh-media` bucket, render a card grid (image preview, or video tag for `video/*`, or generic file icon for PDFs).
- Card actions: **Open** (signed URL in new tab), **Download** (reuse `studio.downloadAsset`), **Delete** (remove from storage + delete row).
- Filter chips: All / Posters / Stock / Videos (driven by `content_type`).
- Search box on `title`.
- Empty state: *"Nothing saved yet. Click 'Save to Hub' on any generated image."*

### Hook helper additions — `src/digital-success/ai/usePromoStudio.ts`
- `listMyHubMedia(limit = 100)` — selects from `dsh_media` where `uploaded_by = auth.uid()`.
- `deleteHubMedia(row)` — removes storage object and `dsh_media` row (with friendly RLS error fallback).

### Save flow improvements (existing tabs)
- After a successful `saveToHub` in Poster / Stock / Video panels, dispatch a lightweight refresh event (or bump a shared counter) so if the Hub tab is opened next it re-fetches.
- Show a toast *"Saved to Hub — view in Saved Hub tab"*.

## Out of scope
- No changes to the global Digital Success Hub page (`DigitalSuccessHomePage`).
- No changes to RLS (the prior migration already allows self-insert/select/update/delete on `dsh_media` for `uploaded_by = auth.uid()`).
- No changes to the underlying poster/stock/video generation logic.

## Files touched
- `src/digital-success/ai/AiStudioPage.tsx` — new tab + banner link.
- `src/digital-success/ai/SavedHubPanel.tsx` — **new** file.
- `src/digital-success/ai/usePromoStudio.ts` — add `listMyHubMedia` + `deleteHubMedia`.
- `src/digital-success/ai/StockImagesPanel.tsx`, `VideoClipPanel.tsx` — updated toast copy pointing to the new tab.
