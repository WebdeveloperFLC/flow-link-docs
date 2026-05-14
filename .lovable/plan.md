# Phase 5 — Approval Workflow

Strictly additive build. Replace 3 stub files only. No other files touched. No new packages.

## Files Touched (3 total)

1. `src/accounting/data/mockApprovals.ts` — **new** (file does not yet exist) — types + `MOCK_APPROVALS` (15 entries)
2. `src/accounting/pages/approvals/AccountingApprovalsPage.tsx` — replace stub
3. `src/accounting/pages/approvals/AccountingApprovalDetailPage.tsx` — replace stub

Routes for `/accounting/approvals` and `/accounting/approvals/:id` are already wired in `src/App.tsx` from Phase 2 — no router changes.

## Mock Data (`mockApprovals.ts`)

Exports `ApprovalStatus`, `ApprovalStepStatus`, `ApprovalStep`, `PaymentRequest`, and `MOCK_APPROVALS`.

15 requests with the exact status mix from spec (3 APPROVED, 2 REJECTED, 2 SUBMITTED, 2 AUDITOR1_REVIEW, 2 AUDITOR2_REVIEW, 2 FINAL_REVIEW, 1 OTP_PENDING, 1 CANCELLED).

Each request carries a 5-step pipeline (Initial submission → Auditor 1 → Auditor 2 → Final auditor → OTP). Step states are derived from the request status per spec rules. Approved/rejected steps include `actionAt`, `comments`, `ipAddress`, `deviceHint`.

Realistic Canadian + India payees: Acme Supplies Ltd, WeWork Toronto, Air Canada, HDFC Bank, Canada Revenue Agency, Payroll Canada, Bell Canada, Shopify Plus, Zomato Catering, Toronto Hydro, etc. Mixed CAD/USD/INR. `daysPending` varies 0–7 so the >48h overdue stat has hits. 3 entries link to `MOCK_JOURNALS` ids; 3 entries link to `MOCK_DOCUMENTS` ids.

## Page 1 — Approval Queue

`AppLayout` + `AccountingPageHeader` (title "Approval queue", subtitle "Accounting · Future Link Flow", actions = "+ New payment request" → `/accounting/ap`).

- **Stats row**: 4 stat cards (`AccountingKPICard`) — Pending approvals, Awaiting my action (currentStep ∈ {2,3}), Overdue >48h, Approved this month.
- **Tabs**: shadcn `Tabs` with All / Pending / Awaiting me / Completed. Each renders the same table with its filtered slice.
- **Table**: plain HTML table mirroring journal-list style. Columns per spec (Request #, Description, Payee, Amount, Entity, Submitted, Current step pill, Days pending, Actions). Status pills use the spec color map with raw Tailwind utility classes (same pattern approved in Phase 3/4).
- **Row click** navigates to detail (excluding Actions column via `e.stopPropagation`).
- **Actions DropdownMenu**: View details always; Approve/Reject only when status ∈ {AUDITOR1_REVIEW, AUDITOR2_REVIEW}; Cancel only when SUBMITTED. Approve uses AlertDialog → advances `currentStep`, marks step APPROVED, transitions overall status to next stage. Reject opens dialog with required reason textarea → status REJECTED. All updates are local component state (`useState` seeded from `MOCK_APPROVALS`). Sonner toast on every action.

## Page 2 — Approval Detail

Reads `:id` via `useParams`, finds in local state mirror of `MOCK_APPROVALS`. Missing → `AccountingEmptyState` + back button.

- **Sticky header**: breadcrumb "Approvals / {requestNumber}" + status badge on left; Back ghost + contextual action buttons on right (Approve/Reject for auditor stages, Final approve/Reject for FINAL_REVIEW, Enter OTP for OTP_PENDING). The header buttons scroll/focus the action panel.
- **Body** (`max-w-4xl mx-auto p-6 space-y-6`):
  - **Card 1 — Request summary**: 2/3-col grid of label/value pairs incl. linked journal & document as blue Links when present.
  - **Card 2 — Approval timeline**:
    - Top step indicator row: 5 circles connected by lines. Color logic per spec (green for APPROVED, primary + animate-pulse ring for current PENDING, muted for future PENDING, destructive for REJECTED). Step number labels below.
    - Detail list below: one bordered row per step with circle, name, role badge, assignee, comments block (italic in `bg-muted/50`), timestamp + IP on the right; pending-current shows amber "Pending" badge.
  - **Card 3 — Action panel** (only when status requires user action):
    - For AUDITOR1/AUDITOR2_REVIEW: comments textarea + "Approve & forward to next step" (green) and "Reject & return to submitter" (destructive). Reject requires non-empty comments (inline error). Both wrapped in AlertDialog confirmations. Sonner toasts.
    - For FINAL_REVIEW: same structure, button labels become "Final approve — proceed to OTP verification" and "Reject request".
    - For OTP_PENDING: 6-box OTP input (`w-12 h-14 text-center text-xl font-mono`), auto-advance via refs, auto-submit on 6th digit, mock validation `=== "123456"`. Wrong code → inline error + CSS keyframe `shake` (defined inline via `<style>` scoped class on the inputs container). Correct → status APPROVED, `approvedAt = new Date().toISOString()`, toast, navigate to `/accounting/approvals`. Includes "Verify & approve" primary button and "Cancel" ghost.
  - **Card 4 — Audit trail**: vertical timeline of derived events (Submitted, each step Approved/Rejected with comments inline, final OTP approval). Each event: colored dot, label, timestamp, IP address (text-xs muted). Same visual pattern as the journal-detail audit timeline.

State management: `useState<PaymentRequest>` seeded from the lookup; mutations create a new object (clone steps array) and update locally. No persistence, no API.

## Reused primitives

- `AppLayout`, `AccountingPageHeader`, `AccountingEmptyState`, `AccountingKPICard`
- shadcn: `Card*`, `Button`, `Input`, `Textarea`, `Tabs`, `DropdownMenu`, `AlertDialog`, `Badge`, `Label`
- `formatCurrency` from `accounting/lib/format`
- lucide-react icons only: Check, X, Clock, AlertTriangle, ChevronLeft, MoreHorizontal, FileText, Link as Link2, Shield, ArrowRight, Plus

## Verification After Build

1. `/accounting/approvals` — stat counts match mock mix; tab filters narrow rows; status pills + days-pending color logic correct; Approve action advances a request through stages with toast; Reject opens reason dialog and flips status.
2. `/accounting/approvals/:id` — timeline circles + connectors color correctly for each fixture status; action panel shows only for actionable statuses; required-comments validation fires on empty reject; OTP `123456` approves and navigates, anything else shakes.
3. Linked journal / document links navigate to correct routes.
4. No edits outside the 3 listed files; no new dependencies.
