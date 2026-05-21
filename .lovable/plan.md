## Problem

The generated posters keep showing:
- **A made-up "University of Canada West" logo** (the model invents one because the prompt explicitly says "institution logo placeholder at top-right" — and FLC logo also gets placed top-right, so they collide).
- **Fake contact details** like `+91-XXXXXXXXXX`, `info@futurelink.com`, `www.futurelink.com` — because the prompt never gives the model the real phone, email, or website, so it freelances placeholders.

## Fix

### 1. Backend prompt (`supabase/functions/dsh-ai-generate-poster/index.ts`)

**Logos — never hallucinate.**
- Replace `BRAND_DEFAULT_NO_LOGO` placeholder text. When no logo refs are attached, instruct the model: *"Do NOT draw, invent, redraw or imagine ANY logo, wordmark, badge, monogram or graduation-cap icon for Future Link Consultants or for the institution. Leave logo areas empty."*
- Differentiate two logo roles:
  - `logo` (FLC brand logo) → top-LEFT, ~18% width, verbatim.
  - `institution_logo` (university/college logo) → top-RIGHT, ~14% width, verbatim.
- If `use_brand` is on but no FLC logo ref is attached, the prompt explicitly forbids drawing a Future Link wordmark.
- If no `institution_logo` ref is attached, the prompt forbids drawing any university logo, wordmark, crest or "OFFICIAL LOGO" badge — even if the institution name is mentioned in the body text.

**Contact details — verbatim or omit.**
- Accept new brief fields: `contact_phone`, `contact_email`, `contact_website`, `cta` (call-to-action line).
- Build a `CONTACT BLOCK` instruction that:
  - Lists ONLY the values the user provided, verbatim, in the footer.
  - Explicitly says: *"Do NOT invent, modify, mask, or add any other phone numbers, emails, websites, or social handles. If a field is not listed here, omit it entirely — no placeholders like XXXXXXXXXX, no example.com, no lorem ipsum."*
- If all three are empty and no CTA, omit the contact footer entirely (model instructed to leave bottom band clean / use a generic "Contact your Future Link counsellor" line).

### 2. `usePromoStudio.ts`

- Extend `RefRole` union: add `"institution_logo"`.
- Extend `PosterBrief` with `contact_phone?`, `contact_email?`, `contact_website?`, `cta?`.
- Update `buildEditInstruction` so `institution_logo` refs map to top-right verbatim placement (mirrors the generate path).

### 3. `ReferenceTray.tsx`

- Add `institution_logo` to `ROLE_LABEL` ("Institution logo (place verbatim, top-right)").
- Add a third quick button: **"Add institution logo"** next to "Add logo" — routes through the same library picker, then forces the role to `institution_logo`.

### 4. `AiStudioPage.tsx` (BriefForm)

- Add a small **Contact details** sub-section in `BriefForm` with four optional inputs: Phone, Email, Website, CTA. Persist them on the brief.
- Sensible default for website (e.g. `www.futurelinkconsultants.com`) but phone/email stay blank by default to force the user to supply real ones — empty = omitted, never placeheld.
- Plumb `pickFromLibrary("logo")` to also allow the new institution-logo role: when the user clicks "Add institution logo", pass that intent through and stamp `role: "institution_logo"` on the resulting ref.

### Out of scope
- Per-institution logo auto-lookup from the institutions table (could be a follow-up — for now the user attaches it manually).
- Auto-pulling contact info from a branch/settings profile (kept manual; defaults can be added in a later pass).
- Background removal for institution logos.

### Files to touch
- `supabase/functions/dsh-ai-generate-poster/index.ts`
- `src/digital-success/ai/usePromoStudio.ts`
- `src/digital-success/ai/ReferenceTray.tsx`
- `src/digital-success/ai/AiStudioPage.tsx`
