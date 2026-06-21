# Application Foundation — Internal UAT

**Scope:** Q1 Application Foundation Step 0 (lean)  
**Tab route:** `?tab=applications` (legacy `?tab=qualification` redirects)  
**User-facing tab:** Applications

## Preconditions

- Client with an open service case
- Editor user with `can_edit_client`
- View-only user for AF-07
- Migrations published: `20260901120000`, `20260901120100`, `20260901120200`, **`20260901120300`**, **`20260901120400`**

## Tab section order (Step 0)

1. Student Application  
2. Offer Information  
3. Application References  
4. Application Milestones  
5. Financial Requirements (placeholder — Q2)  
6. Application Timeline  

| ID | Scenario | Pass |
|----|----------|------|
| AF-01 | Open **Applications** tab on client with service case | ☐ |
| AF-02 | **Create Application** — owner set; identity = institution + program + intake; **offer row (status NONE) + milestones row created**; **no deposit/tuition track rows** | ☐ |
| AF-02a | Create captures **institution_name_snapshot**, **institution_city_snapshot**, **destination_country** from institution master | ☐ |
| AF-02b | Optional snapshot fields on create (program code, campus, intake year, study level, duration, tuition fee/currency) persist on anchor | ☐ |
| AF-OFF-01 | **Offer Information** — set offer type and offer status independently; save | ☐ |
| AF-OFF-02 | Set offer status to **Received** or **Accepted** — **offer_received_at** milestone auto-set if empty | ☐ |
| AF-OFF-03 | Offer save appends **APPLICATION_OFFER_UPDATED** timeline event | ☐ |
| AF-MS-01 | **Record submission** — sets submitted date + submitted_by; rejects duplicate submit | ☐ |
| AF-MS-02 | Edit visa/enrollment milestone dates; save appends **MILESTONE_UPDATED** | ☐ |
| AF-FIN-01 | **Financial Requirements** shows Q2 placeholder only (no inputs, no DB writes) | ☐ |
| AF-06 | **Application Timeline** — create event; lifecycle/owner/admissions/offer/milestone changes append events | ☐ |
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

**Out of scope (Q2+):** funding plans, external events, TRANSFERRED, qualification source, payment recording, commission integration, Phase A catalog publish (full), financial requirements.

## Mark Final → Application (Client Services)

| ID | Scenario | Pass |
|----|----------|------|
| MF-01 | **Client Services → Mark final** wizard collects intake, campus, owner (default Keep me) | ☐ |
| MF-02 | Mark final creates **Draft** application with `application_source = MARK_FINAL` | ☐ |
| MF-03 | `cf_client_programs.qualification_id` set; final card shows code, campus, intake, application status | ☐ |
| MF-04 | **Open application** navigates to Applications tab with correct record selected | ☐ |
| MF-05 | Applications tab banner explains Client Services → Course Finder → Mark final path | ☐ |
| MF-06 | Duplicate institution+intake on same case rejected | ☐ |
| MF-07 | Mark final blocked when institution not linked to UPI master | ☐ |
