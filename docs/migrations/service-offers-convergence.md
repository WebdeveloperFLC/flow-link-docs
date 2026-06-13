# service_offers → offers convergence (O14)

**Status:** UX banner + read-only flag shipped in **Phase 6D**. Data migration deferred to Sprint 10.

Two parallel offer systems exist today:

| System | Table | Primary use |
|--------|-------|-------------|
| **Legacy** | `service_offers` | Client registration invoice preview — percent/fixed/combo discounts on service lines |
| **Performance Hub** | `offers` (+ `client_offers`, wallet allocations) | MarCom catalogue, Give Discount, lifecycle, funding-aware wallet debits |

New promotions should be created in **Performance Hub → Offers library** (`/performance/offers/library`).

---

## Feature flag

| Env | Default | Effect |
|-----|---------|--------|
| `VITE_LEGACY_OFFERS_READ_ONLY` | `false` | When `true`, legacy offer pickers stay visible but **Apply/Remove** is hidden (read-only preview). |
| `VITE_LEGACY_OFFERS_RETIREMENT_DATE` | `December 2026` | Copy in the amber convergence banner. |

No server migration required for the flag — flip in Lovable env / `.env` and republish frontend.

---

## Legacy UI surfaces (Jun 2026)

| Route / component | Reads `service_offers` | Banner scope |
|-------------------|------------------------|--------------|
| Client registration → invoice preview | `InvoicePreviewSection` → `fetchActiveOffers()` | `registration-invoice` |

Give Discount and Offers studio already use `offers` / RPCs — no banner there.

---

## Column mapping — `service_offers` → `offers`

| `service_offers` | Target in `offers` | Notes |
|------------------|-------------------|--------|
| `id` | new `offers.id` | Do not reuse UUIDs if invoice FKs still point at legacy rows until cutover |
| `offer_name` | `title` | |
| `offer_code` | `promo_code` or `offer_tracking_codes` | Unique code per campaign if needed |
| `offer_type` = `PERCENT` | `discount_type` = `percentage`, `discount_value` = percent | |
| `offer_type` = `FIXED_INR` | `discount_type` = `flat`, `discount_value` = amount | |
| `offer_type` = `COMBO` | `offer_category` + rules JSON / multi-line eligibility | Needs product rule for min services |
| `discount_percent` | `discount_value` (when percentage) | |
| `discount_amount_inr` | `discount_value` (when flat) | |
| `applicable_services` (uuid[]) | `applicable_services` (text[] service codes) | **Backfill:** join service catalogue ids → `service_code` |
| `min_services_for_combo` | offer automation / eligibility rule | No 1:1 column — store in `offer_audience_targets` or journey rule |
| `valid_from` / `valid_until` | `valid_from` / `valid_to` | timestamptz vs date — normalize on import |
| `applicable_branches` | audience / branch scope on offer | Map to branch tags or `offer_audience_targets` |
| `max_uses` / `uses_count` | redemption caps + `offer_events` | Reset counts from events where possible |
| `is_active` | `status` (`active`, `draft`, …) | Map inactive → `archived` or `expired` |
| `is_hidden` | internal-only draft | MarCom publish workflow |
| `created_by` / `approved_by` | lifecycle audit columns | |
| `notes` | `description` or internal note field | |

---

## Related tables

| Legacy usage | Hub target | Backfill |
|--------------|------------|----------|
| Invoice line `offer_id` → `service_offers` | `wallet_allocations` + `offers` via Give Discount / `fn_apply_offer_discount` | Re-link open drafts only; posted invoices keep historical FK |
| Per-client assignment | `client_offers` | Create rows when migrating active legacy codes tied to clients |
| Registration-only discount | Performance Hub Give Discount | Counselors re-apply from catalogue after cutover |

---

## Suggested migration order (future SQL — not Phase 6D)

1. Export active `service_offers` where `is_active = true`.
2. Insert into `offers` with mapped columns + `status = 'active'`.
3. Map `applicable_services` uuid → service codes via service catalogue.
4. Set `VITE_LEGACY_OFFERS_READ_ONLY=true` in staging; UAT registration + Give Discount.
5. Archive legacy rows; drop or rename table after zero reads for 30 days.

---

## Acceptance (Phase 6D)

- [ ] Amber banner on client registration invoice preview; dismiss persists in localStorage.
- [ ] CTA opens `/performance/offers/library`.
- [ ] `VITE_LEGACY_OFFERS_READ_ONLY=true` hides Apply/Remove on legacy offer list without code deploy beyond env flip.
