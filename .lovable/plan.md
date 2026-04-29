## Your three concerns, addressed

### 1. "Documents uploaded under Krishaa are actually for Manav — how will the system detect this?"

Right now, every file dropped on a client page is **silently attached to that client**. The classifier only detects the *document type* (Passport, IELTS, etc.), not *whose* document it is. We'll add a name-aware safety net.

**What we'll build:**
- During classification, the AI/edge function already extracts first-page text. We'll also ask it to extract any **person name** found on the document (passport name, transcript holder, bank account holder, etc.).
- Before saving, compare the extracted name to the current client's `full_name` using a fuzzy match (normalize case/spaces, token overlap, Levenshtein on first+last name).
- If the names **don't match**, the upload row turns amber with a warning: *"This document looks like it belongs to **Manav Yogesh Patel**, not Krishaa Ramrakhiani."* and offers three actions:
  - **Reassign** — searches existing clients and moves the upload to the matching one.
  - **Upload anyway** — proceeds (e.g. spouse/parent docs) and tags the doc with `owner_name_detected` for the audit log.
  - **Skip** — discards the file from the queue.
- All decisions are written to `activity_logs` so admins can audit.

### 2. "View document doesn't open, but Download works"

The current `onView` opens the Supabase signed URL in a new tab. Browsers often **download instead of preview** PDFs served from a cross-origin storage host, especially when `Content-Disposition` is `attachment`.

**Fix:** Replace `onView` with a blob-based viewer:
- Download the file as a Blob via the Supabase SDK.
- Create an object URL with the correct `application/pdf` MIME type.
- Open it via `window.open(blobUrl, "_blank")` so the browser's native PDF viewer renders it inline.
- Revoke the URL after a delay.

For images we'll do the same; for unknown types we fall back to download.

### 3. "Do I need to click each document to optimize, or is it automatic?"

**It is already automatic** — every file goes through `processToPdf` on upload, which:
- Converts images → PDF
- Compresses progressively (quality 0.88 → 0.55 for images; 150→110 DPI rasterization for PDFs)
- Targets **≤ 3.8 MB** (under IRCC's 4 MB cap)

The little ✨ "Optimize" button you see only appears for files **already in storage that are still > 1.5 MB** (e.g. uploaded before the new pipeline). It's a manual re-run for legacy files — not something you need to click for new uploads.

**What we'll improve so this is clear:**
- Show a small "**Auto-optimized · 1.2 MB · IRCC ✓**" badge under each new upload.
- Add a **"Re-optimize all"** button on the client page that batches the edge function across every doc > 1.5 MB.
- Hide the per-file ✨ icon when size is already compliant.

---

## Technical details

**New / modified files**
- `supabase/functions/classify-document/index.ts` — also return `owner_name` from first-page text via Gemini.
- `src/lib/classifyDocument.ts` — extend return type with `ownerName` and a `nameMatch` helper (normalize + token Jaccard + Levenshtein on first/last name).
- `src/components/documents/SmartUploadZone.tsx` — new "name mismatch" state per queue item with Reassign / Upload anyway / Skip; reassignment uses a debounced search against `clients.full_name`.
- `src/pages/ClientDetail.tsx`
  - Replace `onView` with blob-URL inline viewer.
  - Add "Re-optimize all" button (loops over docs > 1.5 MB → `process-large-file`).
  - Show compliance badge on each doc row.
- `src/lib/activity.ts` — log `document.owner_mismatch_warned`, `document.reassigned`, `document.uploaded_with_override`.

**No DB schema changes needed.** Owner detection is a runtime check; we only store the result in `activity_logs.details`.

**Edge function prompt addition** (Gemini structured JSON):
```json
{
  "type": "Passport",
  "confidence": 0.93,
  "owner_name": "Manav Yogesh Patel",
  "owner_confidence": 0.88
}
```

**Name match thresholds**
- Exact match (normalized) → ✓
- Token Jaccard ≥ 0.6 OR Levenshtein ratio ≥ 0.85 on full name → ✓
- Otherwise → mismatch warning

**Out of scope** (call out if needed later)
- Bulk reassignment of already-uploaded misfiled docs (we'll add a one-time "Move to another client" admin action in a follow-up).
- OCR for fully scanned PDFs without embedded text — current pipeline relies on `pdfjs-dist` text extraction; if confidence is low we just skip the owner check rather than fail the upload.
