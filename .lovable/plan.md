
## Goal

A single, always-available AI assistant that team members can ask anything about how the CRM works — accounts, client entry, data uploading, flows, programs, institutions, digital success, course finder, templates, offers & discounts, Settle Abroad, telecaller, messages, leads, commissions, etc. It explains *how to use the CRM*, not customer data.

## User experience

- **Floating "Ask AI" button** (bottom-right) on every authenticated page via `AppLayout.tsx`. Hidden on `/auth` and portal routes.
- Clicking opens a **side drawer chat** (sheet, ~480px wide on desktop, full-screen on mobile).
- Also accessible from the sidebar as a top-level item: **"AI Help"** → `/ai-help` (full-page version of the same chat).
- Features:
  - Streaming responses (token-by-token) with markdown rendering.
  - Conversation history per user, persisted in DB.
  - "New chat" button, list of past conversations in a collapsible left rail (full-page view only).
  - Suggested starter questions grouped by module ("How do I add a client?", "How do offers & discounts work?", "How do I import cold leads?", etc.).
  - Each answer can include **deep links** to the relevant page (e.g. "Open Leads → Cold Pool") rendered as buttons.
  - Copy / thumbs-up / thumbs-down on each assistant message (feedback stored for later prompt tuning).

## Scope of knowledge

The assistant answers using a **curated CRM knowledge base** authored as markdown — not by reading live tenant data. Modules covered in v1:
Accounts, Client entry, Data uploading, App flow overview, Programs, Institutions, Digital Success Hub, Course Finder, Templates, Letter templates, Offers & Discounts, Settle Abroad, Telecaller, Messages, Leads (warm/cold), Commissions, Forms & Questionnaires, Documents/Binder, Assessment, User & role management, Masters (branches/departments/services).

Content lives in `src/ai-help/knowledge/*.md`, one file per module, plus a short top-level overview. Easy to edit and expand later.

## Technical design

### Frontend
- New folder `src/ai-help/`:
  - `pages/AiHelpPage.tsx` — full-page chat at `/ai-help`.
  - `components/AiHelpDrawer.tsx` — floating button + Sheet wrapper, mounted once in `AppLayout`.
  - `components/AiHelpChat.tsx` — shared chat UI (messages list, composer, streaming renderer, markdown via `react-markdown`).
  - `components/SuggestedQuestions.tsx` — grouped starter prompts.
  - `hooks/useAiHelpConversation.ts` — manages messages, streaming, persistence.
  - `lib/aiHelpTypes.ts` — `AiHelpMessage`, `AiHelpConversation`.
  - `knowledge/` — module markdown files bundled at build time (`import.meta.glob`).
- Route added in `src/App.tsx`. Sidebar entry added in `AppLayout.tsx`.
- Reuse existing UI tokens (no new colors); match look of existing chat components.

### Backend
- New tables:
  - `ai_help_conversations` (id, user_id, title, created_at, updated_at)
  - `ai_help_messages` (id, conversation_id, role, content, created_at)
  - `ai_help_feedback` (id, message_id, user_id, rating, note, created_at)
  - RLS: users can only read/write their own rows.
- New edge function `ai-help-chat` (streaming, SSE):
  - Validates JWT, loads the conversation's prior messages.
  - Builds a system prompt that embeds the bundled knowledge base (passed in via request body from the client so the edge function stays stateless and content stays in the repo).
  - Calls Lovable AI Gateway with `google/gemini-3-flash-preview`, `stream: true`.
  - Returns SSE stream; persists final assistant message on the client side via a small follow-up insert (or via a second non-streamed write inside the function — TBD during implementation).
  - Handles 429 / 402 with friendly error messages.
- No new secrets required (uses `LOVABLE_API_KEY`).

### Out of scope (v1)
- Reading the user's live data (clients, leads, invoices). The assistant explains *how* to do things, not *what's in your data*.
- Tool/function calling to perform actions (creating a lead, sending an email). Can be added later.
- Multi-language responses (defaults to English; model will follow user's language if they ask in another).
- Voice input.

## Deliverables checklist

- DB migration for the 3 tables + RLS.
- Edge function `ai-help-chat` with streaming.
- `src/ai-help/` module with chat UI, drawer, page, knowledge files.
- Sidebar + floating button integration in `AppLayout`.
- Route registration in `App.tsx`.
- Seed knowledge markdown for all listed modules (concise, ~150–400 words each).

Approve to implement, or tell me what to adjust (e.g. drop the floating button, change scope, add live-data tools).
