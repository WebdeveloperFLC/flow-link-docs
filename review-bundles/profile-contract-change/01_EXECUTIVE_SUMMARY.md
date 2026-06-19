# ProfileViewModel Contract Change — Executive Summary

**Type:** Pre–Phase B contract amendment (Phase A domain layer extension)  
**Status:** Complete — **approval required before remaining Phase B UI work**

---

## What Changed

Three approved amendments to `ProfileViewModel` before Phase B components are built:

1. **Extended `meta`** — CRM context fields for Client 360 / profile header (read-only)
2. **New `services` block** — minimal read-only services snapshot
3. **Canonical `test_id`** — lowercase ids (`ielts`, `gre`, `french`) with catalog labels; DB boundary still uses legacy `IELTS`, `GRE`, etc.

---

## What Was Built

| Deliverable | Description |
|-------------|-------------|
| `profileTestCatalog.ts` | Canonical id ↔ legacy DB ↔ display label mapping |
| `profileServicesSummary.ts` | Pure services snapshot builder |
| Updated normalization | Meta, services, test_id in load/save paths |
| Updated `getProfileViewModel` | Counselor name, status label, pipeline, catalogue |
| Tests | 17 passing — IELTS Academic/General, SAT, French, German, multi-doc education |

---

## Business Impact

- **Phase B UI** can render profile header (FL number, branch, counselor, status) without extra fetches
- **Client 360** can show services line + pipeline progress from same view model
- **Test pills** use stable lowercase keys; display labels from catalog (no hardcoded `IELTS` in components)
- **IELTS** remains one active record with `ielts_variant: Academic | General` — no multi-record redesign

---

## Risks

| Risk | Mitigation |
|------|------------|
| Breaking change vs Phase A bundle | No UI consumed Phase A types yet; amendment is pre–Phase B |
| Non-UUID service codes (`canada::student_visa`) | `serviceLabels` override in summary builder; full catalogue in loader |
| `services` not in `profileSave` | Explicitly excluded — read-only |

---

## Approval Required

**Remaining Phase B UI work is NOT authorized** until this bundle is reviewed and explicitly approved.

---

## Next Step (Owner)

Review `05_SAMPLE_VIEW_MODEL.json` and approve contract before Phase B UI implementation.
