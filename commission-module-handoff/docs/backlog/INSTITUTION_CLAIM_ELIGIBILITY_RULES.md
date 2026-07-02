# Backlog: Institution Claim Eligibility Rules

**Status:** Backlog — **not in Phase 1**  
**Priority:** Phase 2 (after Phase 1 billing, agreement versioning, commission eligibility config, snapshots)  
**Owner:** Product + Institution Team + Finance

---

## Summary

Versioned **claim submission rules** per institution (and optionally per partnership route), aligned with **agreement versions**. These rules govern when FLC may **submit a claim** to an institution or aggregator — distinct from:

| Concept | Phase | Purpose |
|---------|-------|---------|
| **Commission Eligibility Config** | Phase 1 | When a student becomes commission-**eligible** (deposit, visa, enrolled, etc.) |
| **Claim Eligibility Rules** | **This backlog** | When an eligible commission may be **included in a claim cycle / invoice** |
| **Hold reasons** | Phase 1 | Temporary deferral with forecast |

---

## Business need

Institutions often require additional gates before accepting a claim batch:

- Census date passed
- Minimum attendance verified
- Institution internal audit complete
- All documents submitted to institution portal
- Minimum days after enrollment
- Commission period must match institution intake calendar

These vary by agreement version and intake.

---

## Proposed data model (Phase 2)

### `upi_claim_eligibility_configs`
- `institution_id` / optional `aggregator_id` / optional `partnership_route_id`
- `agreement_version_id` FK (versioned alongside agreement)
- `effective_from`, `effective_to`, `status`

### `upi_claim_eligibility_rules`
- `config_version_id` FK
- Rule type: `min_days_after_enrollment`, `requires_census`, `requires_attendance_pct`, `requires_document_set`, `custom`
- Parameters jsonb
- `blocks_claim_submit boolean`

### Resolution
- `fn_evaluate_claim_eligibility(student_commission_id, claim_cycle_id)` → `{ allowed, reasons[] }`
- Called before **Submit Claim** in ClaimsPanel (Phase 2)

---

## Dependencies

- Phase 1 agreement versioning (`upi_agreement_versions.effective_from/to`)
- Phase 1 three-axis lifecycle (`claim_status`)
- Phase 1 holds (must not duplicate hold master — claim rules are institution policy, not ops hold)

---

## Out of scope

- Payment allocations, accounting bridge, forecast engine
- Merging with CRM AR / transfer fees

---

## Acceptance criteria (when implemented)

1. Claim submit blocked when claim eligibility rules fail (with reason list)
2. Rules resolve by student `eligibility_date` + linked `agreement_version_id`
3. Route-level override > institution default
4. UAT: agreement version change changes claim gates without affecting snapshot

---

*Created at Phase 1 kickoff — architecture frozen; implement in Phase 2.*
