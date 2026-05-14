## Phase 7 — Fraud & Audit Enhancement + AI Financial Assistant

Enhance two existing accounting pages. No new routes, no CRM changes, no redesign of other accounting pages. Reuse existing `AppLayout`, `AccountingPageHeader`, `AccountingKPICard`, `AccountingStatusBadge`, semantic tokens, recharts.

### 1. Types & Mock Data

**`src/accounting/types/fraud.ts`** (new)
- `FlagType` union: `DUPLICATE_PAYMENT | UNAPPROVED_VENDOR | ROUND_NUMBER_BILLING | HIGH_VELOCITY | OFF_HOURS_SUBMISSION | AMOUNT_MISMATCH`
- `FlagSeverity`: `critical | warning | info`
- `FlagStatus`: `under_review | confirmed | false_positive | dismissed | escalated | auto_cleared`
- `FraudFlag`: id, txnRef, vendor, amount, currency, entity, flaggedAt, type, severity, status, riskScore, reason, similarTxnIds[]

**`src/accounting/data/mockFraud.ts`** (new)
- ~18 flags across all 6 flag types, mixed severities/statuses
- 30-day risk-score distribution series (date, critical, warning, info)
- Helper: `getSimilarTxns(id)`

**`src/accounting/types/aiChat.ts`** (new)
- `ChatRole`: `user | assistant`
- `RichBlock`: `{ kind: "table"|"chart"|"metric"|"reportLink", payload: any }`
- `ChatMessage`: id, role, content (markdown), blocks?, createdAt
- `Conversation`: id, title, messages, updatedAt

**`src/accounting/data/mockAI.ts`** (new)
- 4 prebuilt conversations (Oct expense spike, AR aging, duplicate invoices, Canada P&L)
- Each scripted assistant reply demonstrates: markdown, an inline table, a mini chart, metric cards, and a report link
- `quickQuestions` array (the 5 prompts from spec)
- `mockReply(prompt)` → returns one of the scripted responses based on keyword match, else a generic fallback

### 2. Fraud & Audit Page Components

**`src/accounting/components/fraud/FraudFlagBadge.tsx`** — colored pill per `FlagType` with short label.

**`src/accounting/components/fraud/RiskDistributionChart.tsx`** — recharts stacked `BarChart` (critical/warning/info) over 30 days, semantic-token colors.

**`src/accounting/components/fraud/FlagDetailModal.tsx`** — `Dialog` showing:
- Transaction header (vendor, amount, entity, date, risk score)
- "Why flagged" rationale block
- Similar transactions table
- Footer actions: `Confirm fraud` (destructive), `Mark false positive`, `Escalate`, `Dismiss` — each fires a sonner toast and updates local state.

### 3. Replace Fraud Page

**`src/accounting/pages/fraud/AccountingFraudPage.tsx`** (replace stub)
- `AccountingPageHeader` ("Fraud & audit")
- 4 `AccountingKPICard`s: Critical flags, Warnings, Auto-cleared, Under review (counts derived from mock)
- `RiskDistributionChart` in a `Card`
- Flagged-transactions `Table` (Date, Txn, Vendor, Amount, Entity, Risk, Type badge, Status). Row click opens `FlagDetailModal`.
- Local `useState` for selected flag and status overrides (in-memory only).

### 4. AI Assistant Components

**`src/accounting/components/ai/ChatSidebar.tsx`** — left rail (~280px):
- "New conversation" button
- Conversation list (active highlight)
- "Quick questions" section with chips that send the prompt
- Collapses to icons under `md:` if needed; full hide on mobile via Sheet trigger above input.

**`src/accounting/components/ai/ChatMessage.tsx`** — bubble with avatar; assistant content rendered with a tiny inline markdown renderer (we already have `react-markdown` if present — otherwise lightweight: bold/italic/list/inline-code regex). Renders `RichBlock`s after markdown.

**`src/accounting/components/ai/ChatRichBlock.tsx`** — switch on kind:
- `table` → shadcn `Table`
- `chart` → small recharts `LineChart` (~h-32)
- `metric` → grid of `AccountingKPICard`-style mini cards
- `reportLink` → `Card` with `Link` to `/accounting/reports/...`

**`src/accounting/components/ai/ChatComposer.tsx`** — bottom bar:
- auto-resizing `Textarea` (rows grow to max ~6)
- entity `Select` (reuses `accountingEntityStore` entities)
- send `Button` (enter sends, shift+enter newlines)

**`src/accounting/components/ai/TypingIndicator.tsx`** — three-dot pulse.

### 5. Replace AI Assistant Page

**`src/accounting/pages/ai/AccountingAIPage.tsx`** (replace stub)
- `AppLayout` with full-height shell: `flex h-[calc(100vh-...)] `
- Left: `ChatSidebar`
- Right column: scrollable message list + `ChatComposer` pinned bottom
- State: `conversations`, `activeId`, `isTyping`. On send → push user msg → set typing true → `setTimeout` 800–1500ms → push `mockReply()` response → typing false.
- Auto-scroll to bottom on new message.

### Markdown rendering

Check `package.json` for `react-markdown`. If present, use it; if not, use a small custom renderer (no new deps). Will verify during implementation.

### Out of Scope

- App.tsx, sidebar, overview page
- All other accounting pages (journals, reports, approvals, owners, documents)
- Real AI calls / Lovable AI gateway (this is a mock UI per spec: "fully functional **mock** AI assistant")
- Persistence (no DB writes)
- CRM modules

### Files Summary

**New (10):** `types/fraud.ts`, `types/aiChat.ts`, `data/mockFraud.ts`, `data/mockAI.ts`, `components/fraud/{FraudFlagBadge,RiskDistributionChart,FlagDetailModal}.tsx`, `components/ai/{ChatSidebar,ChatMessage,ChatRichBlock,ChatComposer,TypingIndicator}.tsx`

**Replaced (2):** `pages/fraud/AccountingFraudPage.tsx`, `pages/ai/AccountingAIPage.tsx`
