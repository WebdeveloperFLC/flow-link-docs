# Frontend Map

## Top-level routing

Defined in `src/App.tsx`. Three shell layouts:
- `AppLayout` (CRM main sidebar) — `src/components/layout/AppLayout.tsx`
- `PortalLayout` (client portal) — `src/components/portal/PortalLayout.tsx`
- Accounting layout — `src/accounting/components/AccountingLayout.tsx`

## Pages

### CRM (`src/pages/`)
| Route | Page | Role gate |
|---|---|---|
| `/` | Dashboard | any signed-in |
| `/clients`, `/clients/:id` | Clients, ClientDetail | per-client (`user_client_permission`) |
| `/clients/new` | ClientNew | `canCreateClient` |
| `/leads`, `/leads/:id`, `/leads/new`, `/leads/cold` | Lead pages | admin/counselor/telecaller |
| `/messages` | Messages (chat) | signed-in |
| `/telecaller` | Telecaller dialer | telecaller/admin |
| `/course-finder` | CourseFinder | counselor+ |
| `/templates`, `/letter-templates`, `/forms`, `/form-builder` | Template tools | admin/documentation |
| `/questionnaire`, `/questionnaire/email-templates` | Questionnaire | admin |
| `/masters`, `/users`, `/team-access`, `/settings` | Admin | admin |
| `/email-logs`, `/email-smtp` | Email admin | admin |
| `/telephony-settings`, `/telephony-integration` | Telephony admin | admin |
| `/reports`, `/activity`, `/offers`, `/verification`, `/commissions` | various | admin/manager |
| `/admin/assessment`, `/admin/germany-rules`, `/admin/noc` | admin tools | admin |
| `/auth`, `/reset-password`, `/shared/:token` | public | none |

### Portal (`src/pages/portal/`)
`/portal/*` — Dashboard, Application, Files, Assessment, Chat, Offers, Refer, Payments, Appointments, Notifications, Settings, Auth, InviteRedeem. Gated by `PortalProtectedRoute` (role `client` or `admin`).

### Accounting (`src/accounting/pages/`)
`/accounting/*` sections: overview, journals, coa, bank-accounts, petty-cash, intercompany, reimbursements, reconciliation, ap (bills), ar (invoices), vendors, clients, documents, approvals, reports (P&L/BS/CF/TB/GL/consolidated), tax, fraud, ai, settings (entities/users/access).
Gated by `useAccountingAccess` + per-module `usePermission(section, level)`.

### Assessment (`src/pages/assessment/`)
Public funnel: Landing → Country → Goal → Verify → Invite → Run. Plus admin pages.

### Institutions / Commissions (`src/institutions/pages/`)
InstitutionsList, InstitutionDetail, CourseReview, AiSuggestions. Gated by `InstitutionsProtectedRoute`, `CommissionsProtectedRoute`.

### Digital Success (`src/digital-success/`)
DigitalSuccessHomePage + AI Studio. Gated by `dsh_can(uid, level)`.

## Shared components (high blast radius)

| Component | Used in | Notes |
|---|---|---|
| `src/components/clients/ClientInvoicesPanel.tsx` | ClientDetail, Accounting AR | **Critical**. Nested dialogs (Payment + Confirm + Receipt). |
| `src/components/documents/*` | ClientDetail, Portal, Letters | Document upload, binder, preview. |
| `src/components/chat/UnifiedChat.tsx` | Messages, ClientDetail, Portal | Realtime channels. |
| `src/components/ui/*` | everywhere | shadcn. Do not patch primitives without audit. |
| `src/components/clients/*` panels | ClientDetail tabs | Each tab is autosaving — see `07-ui-flow-map.md`. |
| `src/components/notifications/HandoffBell.tsx` | AppLayout | Realtime subscription. |

## State containers

- **AuthContext** (`src/contexts/AuthContext.tsx`) — single source for `roles`, `isAccountingAdmin/Member`, `isCommissionAdmin`.
- **Accounting Zustand stores** (`src/accounting/stores/*`) — persisted to localStorage; some are mock, some hydrate from Supabase.
- **Permissions store** (`src/accounting/hooks/usePermission.ts`) — module sync external store.
- **BrowserPhoneContext / CallContext** — telephony.
- **ThemeProvider** — light/dark + brand tokens.

## Data-loading patterns

1. Page mounts → `supabase.from(...).select(...)` directly OR via thin helper in `src/lib/*`.
2. Realtime subscription set up in `useEffect`, torn down on unmount.
3. Most lists are not memoized via TanStack Query — they refetch on focus manually or via realtime.