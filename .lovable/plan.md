## Plan: Service description info icon in ServiceTabs

**Scope:** `src/components/leads/ServiceTabs.tsx` only. No DB changes, no other modules touched.

### Change
In each service row inside the tab content list, when `s.notes` is a non-empty string, render a small `Info` icon (lucide-react) immediately to the right of `s.service_name`.

- Icon: `<Info className="h-3.5 w-3.5 text-muted-foreground" />`, wrapped in a `PopoverTrigger asChild` button (`type="button"`, `onClick` stops propagation so the parent `<label>` doesn't toggle the checkbox).
- Popover (`@/components/ui/popover`):
  - Heading: `s.service_name` (font-medium)
  - Body: `s.notes` rendered as plain text (`whitespace-pre-wrap text-sm text-muted-foreground`)
  - Close: small `X` button (lucide `X`) in top-right that closes the popover via controlled `open` state per row, OR rely on Radix outside-click + add an explicit X button that sets `open=false`.
- Opens on click only (Popover default = click). No hover behavior.
- When `s.notes` is null/empty/whitespace-only, render nothing — row stays clean.

### Notes
- `notes` is already part of `ServiceCatalogueItem` and `fetchAllServiceCatalogue` uses `select("*")`, so it's already in scope. No query changes.
- Notes are read-only here; no edit affordance.
- Applies to all 5 tabs since the row render path is shared.

### Files
- Edit: `src/components/leads/ServiceTabs.tsx` (add Popover import, Info/X icon imports, per-row controlled open state via a `Set<string>` of open row ids, render icon + popover conditionally).
