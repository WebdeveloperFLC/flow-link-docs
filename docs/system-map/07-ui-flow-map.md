# UI Flow Map

## Layout shells
- `AppLayout` — CRM sidebar + topbar + handoff bell + browser phone panel.
- `AccountingLayout` — separate sidebar with module-permission gating per nav item.
- `PortalLayout` — client-facing sidebar.

## Modal / dialog architecture

### shadcn primitives in use
- `Dialog` (with portal, overlay z-50).
- `AlertDialog` (separate portal, overlay z-50; we override to z-[70] for nested confirms).
- `Sheet` (right-side drawer).
- `Popover`, `Tooltip`, `DropdownMenu` (no portal stacking issues).

### Known nested-dialog points (audit before changing!)
| Parent | Child | Pattern |
|---|---|---|
| Record Payment Dialog (`ClientInvoicesPanel`) | "Confirm payment received?" AlertDialog | **Sibling, not nested**. AlertDialog rendered outside parent Dialog; z-[70]. |
| Generate Receipt Dialog | Confirm send-email AlertDialog | Same pattern as above. |
| Document Preview | Delete confirmation | AlertDialog as sibling. |
| Template Editor (`TemplateEditorDialog`) | Discard-changes AlertDialog | Sibling. |
| Post-Call Notes Dialog | Save-and-close confirm | Sibling. |

### Z-index ladder
| Layer | Z |
|---|---|
| App content | auto |
| Sticky headers | 10 |
| Sidebar | 30 |
| Toaster | 40 |
| Dialog overlay/content | 50 |
| Nested AlertDialog (confirms above a Dialog) | 70 |
| Telephony in-call HUD | 80 |

## Autosave patterns
- **Field-level** (Overview, Profile, Education): debounce 600ms → single `update().eq('id', ...)`.
- **Block-level** (Notes, Address): on blur.
- **Optimistic** (Tasks status toggle): immediate UI flip, rollback on error toast.
- **Lock-aware**: invoice fields read `invoice_locked_for_edit` before allowing edits.

## Data loading sequence (ClientDetail example)
1. Resolve `clientId` from route.
2. Permission check via `useClientPermission(clientId)`.
3. Parallel fetch: client, profile, education, family, case_people.
4. Lazy fetch on tab activation: invoices, documents, tasks, timeline, chat, appointments.
5. Subscribe realtime: timeline + notifications + chat for active channel.

## API call hotspots
| Action | Calls |
|---|---|
| Open ClientDetail | ~6 parallel selects + 2 subscriptions |
| Record Payment | 1 insert (`client_invoice_payments`) → server triggers do the rest; UI then refetches invoice + timeline |
| Generate Receipt | 1 insert (`client_invoice_receipts`) → server triggers → frontend invokes `notifications-dispatch` |
| Send notification | 1 edge fn call → 1+ `smtp-send` calls → 1+ `app_email_logs` rows + timeline rows |
| Document upload | 1 storage upload + 1 row insert + 1 enqueue |
| Send chat message | 1 insert + realtime fan-out |

## Browser stacking gotchas
- Always set `onPointerDownOutside` + `onEscapeKeyDown` on nested AlertDialogs to prevent the parent dialog from closing.
- Always call `e.preventDefault()` on confirm-button click handlers inside an AlertDialog that lives over a parent Dialog.
- Use `max-h-[88vh] overflow-y-auto` for any modal whose content can grow.