# Application Foundation — Internal UAT

**Scope:** Q1 Application Foundation only (lean)  
**Tab route (unchanged):** `?tab=qualification`  
**User-facing tab:** Applications

## Preconditions

- Client with an open service case
- Editor user with `can_edit_client`
- View-only user for AF-07
- Migrations published: `20260901120000`, `20260901120100`, `20260901120200`

| ID | Scenario | Pass |
|----|----------|------|
| AF-01 | Open **Applications** tab on client with service case | ☐ |
| AF-02 | **Create Application** — owner set; identity = institution + program + intake; deposit/tuition tracks created | ☐ |
| AF-03 | **Deposit Tracking / Tuition Tracking** — required/total, paid = 0, outstanding shown; no FLC AR/trust/GL posting from tab | ☐ |
| AF-06 | **Application Timeline** — create event; lifecycle/owner/admissions changes append events | ☐ |
| AF-07 | View-only user — read all cards; no create/edit actions | ☐ |
| AF-08 | Commission regression — Mark Eligible unchanged | ☐ |
| AF-11 | **Application Lifecycle:** Draft → Active | ☐ |
| AF-12 | Active → Refused (reason required) | ☐ |
| AF-13 | Active → On Hold (hold reason; amber badge) | ☐ |
| AF-14 | On Hold → Active | ☐ |
| AF-15 | Reassign **Application Owner** | ☐ |
| AF-16 | **Admissions Stage** change — lifecycle unchanged | ☐ |
| AF-17 | **Application References** — add country default + custom type; edit number/notes; remove; timeline event | ☐ |
| AF-17a | Duplicate reference type rejected (e.g. second Student ID) | ☐ |
| AF-17b | Case-insensitive duplicate rejected (`Student ID` then `student id`) | ☐ |
| AF-17c | Same reference number under different types allowed (e.g. Application ID and Portal ID both `APP12345`) | ☐ |
| AF-17d | Edit existing reference number/notes on same type allowed | ☐ |
| AF-17e | Edit reference type to an existing type rejected (e.g. rename to CAS when CAS exists) | ☐ |
| AF-18 | Re-create application after Cancelled/Refused on same intake | ☐ |

**Owner:** Balveer + Engineering

**Out of scope (Q2+):** funding plans, external events, TRANSFERRED, qualification source, payment recording, commission integration.
