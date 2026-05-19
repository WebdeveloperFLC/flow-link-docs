## Fix: Lead save fails when Last Education or Start Timeline is filled

### Root cause
Two leftover CHECK constraints on `public.leads` reject the values the new form produces:

- `leads_last_education_check` — allows only `10th, 12th, under_graduate, graduate, other`. The dynamic dropdown (FIX 1 from earlier) reads from `master_items.qualification_levels`, which also includes `diploma, post_graduate, mba, phd`. Picking any of those fails the insert/update.
- `leads_start_timeline_check` — allows only `immediately, within_week, within_month, not_sure`. The form field is a free-text input ("e.g. Sep 2026"), so any user input fails.

This matches the symptom: save works with a few fields, then fails as more fields are filled — independent of sequence.

### Change
Single migration on `public.leads` only. No app code changes, no other modules touched.

```sql
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_last_education_check;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_start_timeline_check;
```

Rationale:
- `last_education` values are now governed by `master_items` (admin-managed via /masters). A hardcoded CHECK duplicates and conflicts with that source of truth.
- `start_timeline` is a free-text field by design; an enum CHECK is wrong for it.

Other check constraints (`gender`, `marital_status`, `lead_temperature`, `lead_type`, `status`, `priority`) are left intact — they match the form's fixed options.

### Verification
1. Open `/leads/new`, fill all fields including Last Education = "Diploma" and Start Timeline = "Sep 2026", click Save & View — should succeed.
2. Re-test with each qualification option (10th, 12th, Diploma, Under Graduate, Post Graduate, MBA, PhD, Other).
3. Confirm existing leads still load and edit cleanly.

### Out of scope
No changes to accounting, commission, institution, personal wealth, or client modules. No UI/logic changes in `LeadNew.tsx`.