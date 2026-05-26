# Change Impact Checklist

Copy this block into every PR description (or plan) that touches more than a single isolated UI element.

```markdown
## Change Impact

- **Tables touched**:
- **Triggers possibly fired** (list trigger functions):
- **RLS policies in scope** (list policies + helpers):
- **Edge functions invoked** (caller chain):
- **UI components rendered** (incl. shared like ClientInvoicesPanel):
- **Roles affected** (app_role + accounting_role + module perms):
- **Email/notification events emitted** (notification.* timeline keys):
- **Timeline events written** (event_type strings):
- **Storage buckets touched**:
- **Realtime channels affected**:
- **Backward-compat risks** (removed columns, renamed events, modal restructure):
- **Rollback plan**:
- **Safety rules cited** (R-numbers from 09-safety-rules.md):
- **Manual test plan** (list flows to re-run in preview):
```

## Pre-merge gates

1. Build passes (auto).
2. RLS unchanged OR explicit security memory updated.
3. If `client_invoices*` touched → run: create draft → send → record partial payment → record full payment → generate receipt → verify email + timeline.
4. If modal restructured → verify nested confirm closes cleanly + parent does not unmount.
5. If autosave changed → test as counselor, telecaller, documentation, viewer.
6. If trigger changed → run an INSERT and an UPDATE in SQL editor and inspect side-effects.