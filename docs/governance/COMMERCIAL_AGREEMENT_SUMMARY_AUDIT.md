# Commercial Agreement Summary — Constitutional Compliance Mapping

**Status:** Audit / architecture alignment · **No implementation**  
**Constitution:** [COMMERCIAL_AGREEMENT_SUMMARY_CONSTITUTION.md](./COMMERCIAL_AGREEMENT_SUMMARY_CONSTITUTION.md) (frozen)

---

## Executive answer

The constitution is **compatible** with the published schema (531) and local CAE Phase 2 (541). It defines the **Agreement Summary presentation layer** on top of CAE — not a replacement for `commercial_agreements` / versions.

**Operational source of truth** = structured CAE data (summary fields, rules, overlays, validity).  
**Legal source of truth** = signed document (`file_path` / storage — reference only).

---

## Tab → data source mapping

| Tab | CAE / platform target | Exists today | Gap |
|-----|----------------------|--------------|-----|
| **1. Overview** | `commercial_agreements` + `commercial_relationships` (proposed) + parties | Partial (541 local) | Relationship manager, health score, notice period fields |
| **2. Commercial Summary** | `commercial_summary_text` or generated from `rules_json` (business language) | ❌ | Summary generator; hide raw formulas |
| **3. Commission Structure** | `commercial_agreement_versions.rules_json` + adapter from `upi_commission_rules` | UPI rules exist separately | Unified CAE rule display model |
| **4. Temporary Offers** | Overlay table (never touches master version) | `incentive_campaigns` (counselor scope) | `commercial_offer_overlays` table + UPI promos |
| **5. Validity Management** | Computed status from dates + lifecycle | Partial (`fn_cae_resolve_agreement_version`) | `fn_cae_commercial_item_status(as_of)` |
| **6. Renewal & Extension** | EWE workflow + new version | Lifecycle service (541 local) | Reminder cron + extension request type |
| **7. Institution Promotions** | Read-only sync from institution master | `upi_partnership_routes` fee waiver cols; institution fee schedule | **Remove duplicate waiver UI**; bind to institution RPC/view |
| **8. Figures** | Aggregates from commission receipts + settlements | Commission tracking KPIs | Per-agreement rollup RPC |
| **9. Executive Alerts** | Notification router + platform_config rules | FOE notifications (Phase C) | CAE alert rule seed |

---

## Constitutional rule → enforcement point

| Rule | Enforced where |
|------|----------------|
| No settlement outside validity | **CAE** `evaluateSettlementEligibility` + **Settlement Engine** (future) — must pass `as_of` date |
| Expired terms = audit only | Immutable versions + status `expired`; RPC rejects inactive version |
| Overlays ≠ master agreement | Separate `commercial_offer_overlays` with `master_agreement_id` FK; never UPDATE version |
| Extension = new version | `agreementLifecycleService.activateAgreementVersion` + extension workflow |
| Fee waiver = institution SSOT | Agreement Summary **view** joins institution master; no editable waiver on agreement |

Priority stack (unchanged):

```
Constitution → Customer Ownership → Commercial Agreement (validity) → Settlement Rules → Workflow → Accounting
```

---

## Existing assets to reuse (no redesign)

| Asset | Agreement Summary use |
|-------|----------------------|
| `commercial_agreements` + `versions` (541) | Master agreement + immutable terms |
| `financial_parties` + `commercial_agreement_parties` | Overview tab parties |
| `platform_config` | Reminder schedules, alert roles, validity thresholds |
| EWE + `agreementLifecycleService` | Extension / renewal approval |
| `foe_business_events` | Audit for every extension, rule change, overlay |
| `notificationRouter` | Executive alerts |
| `upi_commission_rules` / `fn_evaluate_eligibility` | Commission Structure tab (via adapter) |
| `incentive_campaigns` | Temporary offers (counselor/incentive overlay class) |
| Institution fee schedule + partnership route waiver | Tab 7 sync (SSOT) |

---

## Proposed additive schema (post–541 review)

Non-destructive extensions only:

| Table / object | Purpose |
|----------------|---------|
| `commercial_relationships` | Party ↔ party link (Overview: Relationship) |
| `commercial_summary_snapshots` | Cached business-language summary per version |
| `commercial_offer_overlays` | Temporary offers (Tab 4) — FK to agreement, never version |
| `commercial_validity_reminders` | Scheduled reminders (180…7 days) |
| `fn_cae_commercial_item_status(item, as_of)` | Active / Upcoming / Expiring Soon / Expired |
| View `v_agreement_fee_waiver_from_institution` | Tab 7 read-only sync |

---

## What NOT to build separately

- Application fee waiver maintenance on agreement screen (constitution forbids)
- Technical formula display in Commercial Summary tab
- Editing active agreement version terms in place (use new version)
- Temporary offer rows that UPDATE `commercial_agreement_versions`

---

## Phase alignment

| Phase | Scope |
|-------|-------|
| **Phase 2 (approved, local 541)** | Registry, versions, lifecycle, ownership — foundation |
| **Phase 2b (architecture review)** | `commercial_relationships`, summary fields, overlay table design |
| **Phase 3 (Settlement Engine)** | Validity enforcement at settlement time (`as_of` gate) |
| **Phase 4 (Agreement Summary UI)** | Nine tabs — read structured CAE + institution sync |
| **Phase 5** | Figures rollups, executive alert wiring |

---

## Risk if ignored

| Risk | Impact |
|------|--------|
| Duplicate fee waiver on routes vs institution | SSOT violation; stale agreement data |
| Incentive campaigns without validity gate | Settlements outside offer period |
| UPI rules without CAE validity check | Commission calc ignores agreement expiry |
| No business-language summary layer | Users forced to open PDFs (constitution violation) |

---

## Related documents

- [CUSTOMER_OWNERSHIP_PROTECTION_CONSTITUTION.md](./CUSTOMER_OWNERSHIP_PROTECTION_CONSTITUTION.md)
- [SPRINT_4_CAE_SETTLEMENT_AUDIT.md](../fleos/SPRINT_4_CAE_SETTLEMENT_AUDIT.md)
- [SPRINT_4_CAE_PHASE2_DELIVERABLE.md](../fleos/SPRINT_4_CAE_PHASE2_DELIVERABLE.md)
