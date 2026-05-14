# Phase 4 — Documents & OCR Module

Build the 3 document pages with mock data only. Strictly additive: 3 stub replacements + 1 new mock data file.

## Files Touched (4 total)

1. `src/accounting/data/mockDocuments.ts` — **new** — types + `MOCK_DOCUMENTS` (20 entries)
2. `src/accounting/pages/documents/AccountingUploadPage.tsx` — replace stub
3. `src/accounting/pages/documents/AccountingOCRPage.tsx` — replace stub
4. `src/accounting/pages/documents/AccountingDocumentsPage.tsx` — replace stub

No new packages. No router/sidebar changes (routes already wired). No CRM/Phase 2/Phase 3 files touched.

## Mock Data (`mockDocuments.ts`)

- Exports types: `DocType`, `OCRStatus`, `ApprovalStatus`, `MockDocument`.
- `MOCK_DOCUMENTS`: 20 entries with status mix exactly per spec — 8 COMPLETE (with extracted), 4 PENDING, 3 PROCESSING, 3 FAILED, plus 2 of the COMPLETE ones flagged `isDuplicateSuspected=true` (so 8 COMPLETE total includes the 2 duplicates). Realistic Canadian + India vendor names, mixed file types, varied confidences 0.72–0.98, per-field confidences, 5 entries linked to `MOCK_JOURNALS` IDs.

## Page 1 — Upload Centre

- `AppLayout` + `AccountingPageHeader` with "View document library" action.
- Large drag-drop Card zone (drag/drop + click triggers hidden multi-file input, accepts `.pdf,.jpg,.jpeg,.png,.webp,.xlsx,.csv`). Accepted-type pill badges below.
- Upload queue Card appears once files are added: per-row icon (FileText/Image/FileSpreadsheet by extension), name, size, progress bar with 4 status states, × remove (queued/error only). "Upload all" button uses `setInterval` to animate each file 0→100% over ~1.5s, then marks complete; toast on completion. "Clear all" wipes the queue.
- Success state replaces queue when all complete: green check, summary, "Review OCR queue" / "Upload more" buttons.
- "Recent uploads" Card always visible — table of last 10 from `MOCK_DOCUMENTS` sorted by `uploadedAt` desc, with OCR status badge (PROCESSING uses an animated pulse dot via `animate-pulse`), and Review/View links per spec rules.

## Page 2 — OCR Review Queue

- Header with dynamic counts; 4 stat pills (Complete/Processing/Pending/Failed counts).
- Queue navigation Card: Previous / "X of Y" / Next, status filter Select (All/Needs review/Complete/Failed), Skip ghost button. Local state holds current index plus a working list (filtered).
- Confidence banner colored by `extracted.confidence` (≥0.85 green, ≥0.65 amber, else red) with appropriate lucide icon.
- Duplicate warning banner (amber) shown only when `isDuplicateSuspected`, with "View original" link to the duplicate's id (in-page anchor / no-op + toast since other doc viewer is mock).
- Two-column layout (`lg:grid-cols-2`):
  - **Left**: mock document preview card — aspect-[3/4] muted box with FileText icon, filename, "Page 1 of 2", page nav buttons, zoom buttons (all visual only), highlight legend dots below.
  - **Right**: editable form preloaded from `extracted`. All 14 fields per spec, each with optional confidence indicator + amber border on low-confidence inputs. GL account Select pulls from `MOCK_ACCOUNTS` formatted as `code — name`.
- Action button row (sticky-ish at bottom of right card via `pt-3 border-t` inside CardContent): "Create journal entry" → navigates to `/accounting/journals/new`; "Mark as duplicate" + "Reject" via AlertDialog → remove current from working list and advance; "Skip" → advance index. "Re-run OCR" in card header flips current doc to PROCESSING in local state for 2s then back to COMPLETE with toast.
- All edits stored in local component state; no persistence.

## Page 3 — Document Library

- `AccountingPageHeader` with "Upload documents" action.
- Filter bar: search input (filename / linkedVendor / extracted.vendorName / extracted.invoiceNumber, case-insensitive), Doc-type Select, Entity Select, OCR-status Select, From + To date inputs.
- Result count line.
- Plain HTML table per spec (9 columns, distinct muted-color pill per `DocType`, OCR status badge with pulse dot for PROCESSING, approval badge, linked-journal pill that navigates to `/accounting/journals/{id}`).
- Actions DropdownMenu (View/Download/Link/Reject/Delete) — Reject and Delete use AlertDialog and update local state; View/Download show toasts; Link navigates to journals list.
- Pagination: 15 per page, Previous / Next outline buttons + "Page X of Y" (matches journals list pattern).

## Styling

- Reuses `AccountingPageHeader`, `formatCurrency`, `cn`, shadcn primitives (Card, Button, Input, Select, DropdownMenu, AlertDialog, Badge).
- Spec-mandated raw Tailwind colors (green/amber/red/blue/purple/teal pills) used inline within these documents pages only — same approach approved for Phase 3 journal pages.
- No new icons beyond lucide-react: FileText, Image, FileSpreadsheet, Upload, CheckCircle, AlertTriangle, AlertCircle, Download, RefreshCw, ZoomIn, ZoomOut, MoreHorizontal, X, Plus.

## Verification After Build

1. `/accounting/documents/upload` — drag/drop + browse adds files; "Upload all" animates progress; success state shows; recent uploads table renders with proper status badges.
2. `/accounting/documents/ocr` — banner color matches confidence; Prev/Next traverse queue; field edits persist while navigating; Mark duplicate / Reject remove the doc and auto-advance; Re-run OCR cycles status.
3. `/accounting/documents` — all filters narrow rows; pagination works; linked-journal pill navigates; Delete dialog removes locally.
4. No changes outside the 4 listed files.
