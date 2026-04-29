## Reality check first (important)

You asked if we can verify documents "exactly like Synergy Gateway" and catch any fake/manipulated document "fully without any errors."

Two honest things you need to know before we build:

1. **What Synergy Gateway (SGV Verified) actually does** — based on their own portal, it's a *managed compliance platform* where **human reviewers** check student placement documents (immunizations, CPR, police checks) against school rules. It is **not** a magical AI that proves a PDF is genuine. Most of their "verification" is rule-based + manual review + issuer follow-up.
2. **No system on earth — including SGV, Onfido, Jumio, or government tools — can guarantee 100% fraud detection with zero errors.** Anyone promising that is lying. What we *can* build is a strong multi-signal verification pipeline that catches the **majority** of common fakes and flags suspicious documents for human review.

So the honest deliverable is: **a Document Verification section that runs automated authenticity checks, returns a risk score with evidence, and routes anything suspicious to a human reviewer.** Not "fully without errors" — that's not achievable by anyone.

---

## What we'll build

A new **Verification** section (sidebar entry, admin + counselor access) where you can:

- Upload a document (or pick one already uploaded against a client)
- Run an automated multi-check verification pass
- See a risk score (Pass / Review / High Risk) with per-check evidence
- Mark final status manually (Verified / Rejected / Needs reissue) with notes
- Keep a full audit trail per document

### Detection signals we can realistically implement

| Check | What it catches | Reliability |
|---|---|---|
| **PDF metadata & producer analysis** | Edited-in-Word/Photoshop PDFs, mismatched creation/mod dates, suspicious producers (e.g. "iLovePDF", "Smallpdf") | High for lazy fakes |
| **Incremental-update / revision detection** | PDFs that were re-saved after signing, hidden object streams, multiple `%%EOF` markers | High |
| **Font & text-layer consistency** | Numbers/names sitting on a different text layer than surrounding text (classic edit signature) | Medium-high |
| **Image-level forensics on scans** | ELA (Error Level Analysis), copy-move detection, JPEG ghost, resampling artifacts around names/dates/amounts | Medium |
| **OCR vs. embedded-text mismatch** | Visible text differs from the PDF's text layer (a common manipulation tell) | High |
| **Field-consistency checks** | Name on passport ≠ name on transcript ≠ name on bank statement; DOB conflicts; mismatched issue/expiry; impossible dates | High |
| **Template/issuer matching** | IELTS TRF layout, university transcript layouts, GIC certificate format — flag if structure deviates from known good templates | Medium (improves over time) |
| **AI vision review** | Gemini/GPT-5 reviews the rendered page and explains what looks off (alignment, kerning, seal pixelation, signature pasting) | Medium, great as evidence |
| **MRZ / passport check digits** | Validates passport machine-readable zone using ICAO 9303 check digits — catches numeric tampering instantly | Very high for passports |
| **Cross-document corroboration** | Compares this doc against everything else uploaded for the client | High |
| **Duplicate / reuse detection** | Perceptual hash against all previously uploaded docs across all clients to catch the same fake reused | High |

### What we **cannot** do (be aware)

- Call the issuing university / bank / IRCC / IELTS to confirm the document is on their system. That requires paid integrations (e.g. **IELTS TRF Verification Service**, **WES**, **DigiLocker**, **Equifax bank-statement verification**, **National Student Clearinghouse**). I can wire any of these in later if you sign up — they're the only way to get a true "this document exists in the issuer's records" answer.
- Detect a perfect, professionally-made forgery with no digital artifacts. No tool can.
- Promise zero false positives or zero false negatives.

---

## How it will work (user flow)

```text
Verification page
 ├── Upload doc (or pick from client)
 ├── Select doc type (Passport / IELTS / Transcript / Bank statement / Offer letter / Other)
 ├── [Run verification]  ──►  Edge function pipeline
 │                              1. PDF structural scan (pdf-lib / qpdf-style checks in JS)
 │                              2. Render pages → image forensics (ELA, hashes)
 │                              3. OCR + extract text layer → compare
 │                              4. Type-specific rules (MRZ, IELTS bands sanity, etc.)
 │                              5. Cross-check vs. client's other docs
 │                              6. AI vision pass for visual anomalies
 │                              7. Aggregate → risk score 0–100 + reasons
 └── Result panel
       ├── Overall: Pass / Review / High Risk
       ├── Per-check rows with ✓ / ⚠ / ✗ and evidence snippets
       ├── Side-by-side: rendered page + highlighted suspicious regions
       ├── "Mark as Verified / Rejected / Request reissue" with reviewer note
       └── Full history saved to the doc + activity log
```

---

## Technical changes

**New DB tables**
- `document_verifications` — one row per verification run: `document_id`, `risk_score`, `risk_level` (`pass|review|high_risk`), `signals` (jsonb of all check results), `ai_summary`, `reviewer_status`, `reviewer_id`, `reviewer_note`, `created_at`. RLS: read by authenticated, write by admin/counselor/documentation.
- `document_fingerprints` — `phash`, `sha256`, `document_id`, `client_id` for duplicate-reuse detection across clients.

**New edge function: `verify-document`**
- Input: `document_id` (or direct upload payload)
- Loads file from `client-documents` bucket
- Runs the pipeline above (PDF parsing in Deno, image rendering, calls Lovable AI Gateway with `google/gemini-2.5-pro` for the vision pass)
- Returns structured signals + score
- Stores result in `document_verifications`

**Frontend**
- New page `src/pages/Verification.tsx` (sidebar item "Verification", admin/counselor only)
- New component `VerificationReportCard.tsx` to render signals, evidence, and reviewer actions
- Hook `useVerification(documentId)` for fetching/triggering runs
- Add a "Verify" button on each document row in `ClientDetail` that deep-links to the report

**No changes** to existing upload/classification — verification is a separate, opt-in pass.

---

## Out of scope for v1 (we can add later if you want)

- Paid issuer-verification integrations (IELTS, WES, DigiLocker, bank APIs)
- Liveness / selfie matching for passport photos
- Bulk re-verification of historical documents
- Webhook out to your firm's review queue / Odoo

---

## Confirm before I build

Tell me:
1. **Go ahead with this scope** as v1?
2. Any specific document types you want prioritized first (passport, IELTS, transcripts, bank statements)?
3. Do you eventually want me to wire in a paid issuer-verification provider (IELTS TRF, DigiLocker, etc.)? Not now — just so I design the schema to support it.