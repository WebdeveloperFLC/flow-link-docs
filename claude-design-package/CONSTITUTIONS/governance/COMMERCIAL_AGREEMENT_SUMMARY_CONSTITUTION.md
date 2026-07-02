# FLEOS Constitution — Commercial Agreement Summary (Executive View)

**Status:** ❄️ Frozen  
**Effective:** Sprint 4+ (Commercial Agreement Engine, Agreement Summary UI, Settlement Engine)

---

## Principle

The **Agreement Summary** is the operational source of truth.  
The **signed agreement** is the legal source of truth.

Users should rarely need to open the agreement document because all operational information must be available in structured form.

---

## Agreement Tabs

### 1. Overview

- Agreement Status
- Party
- Relationship
- Company
- Branch
- Effective Date
- Expiry Date
- Renewal Date
- Notice Period
- Agreement Health
- Relationship Manager

### 2. Commercial Summary

Display business language only.

Examples:

- Commission is calculated at **15% of tuition received**.
- Commission becomes payable **after university payment is received**.
- Claims must be submitted within **60 days**.
- Agreement covers **Canada undergraduate and postgraduate programs**.

Do not display technical formulas.

### 3. Commission Structure

Dedicated tab. Every commission rule should display:

- Commission Type
- Calculation Method
- Trigger Event
- Settlement Cycle
- Currency
- Tax Treatment
- Minimum Threshold
- Maximum Limit
- Applicable Countries
- Applicable Institutions
- Applicable Programs
- Effective Date
- Expiry Date
- Current Status

Examples: 15% of Tuition Received · CAD 500 per Student · Tiered Commission · Revenue Share · Hybrid Structure

Users should immediately understand how commissions are calculated without opening the agreement.

### 4. Temporary Commercial Offers

Separate tab. Examples:

- Additional Commission
- Bonus Commission
- Counsellor Incentives
- Branch Incentives
- Seasonal Promotions
- Festival Offers
- Intake Promotions
- Marketing Campaigns
- University Promotional Circulars

Every temporary offer contains:

- Name · Type · Description · Financial Impact
- Valid From · Valid Until · Status
- Supporting Documents · Approval Reference
- Budget (optional) · Target (optional)

**Temporary offers never modify the Master Agreement.** They are overlays.

### 5. Validity Management

Every commercial item must display its status automatically.

Examples: Active · Upcoming · Expiring Soon · Expired · Suspended · Terminated

Users must immediately know whether the information is still valid.

Expired items remain visible for audit purposes but **cannot be used for new settlements**.

### 6. Renewal & Extension

The system automatically generates reminders before expiry.

Default reminders: 180 · 90 · 60 · 30 · 15 · 7 days

When permitted, users may submit an Extension Request.

```
Expiry Reminder
  → Request Extension
  → Approval Workflow
  → Approved
  → New Validity Period
  → Agreement Updated
```

Every extension creates a **new version** and complete audit history.

### 7. Institution Promotions

Application Fee Waiver must **not** be maintained separately.

It should automatically synchronize from the **Institution Master**.

Display as Application Fee Waiver:

- Status · Amount · Valid From · Valid Until
- Applicable Programs · Applicable Campuses

Whenever Institution data changes, Agreement Summary reflects the latest valid information. **Single Source of Truth applies.**

### 8. Figures

Every agreement displays:

- Estimated Revenue · Actual Revenue · Revenue Target
- Commission Earned · Commission Received · Commission Outstanding
- Temporary Bonus Liability · Settlement Value · Pending Claims
- Performance Against Target

### 9. Executive Alerts

Automatically notify:

- Agreement Expiring · Temporary Offer Expiring · Application Fee Waiver Expiring
- Renewal Required · Extension Requested · Extension Approved
- Commercial Rules Changed · Commission Structure Changed

Notifications should be configurable by role.

---

## Constitutional Rule

No commercial rule, commission, incentive, bonus, or temporary promotion shall be applied **outside its configured validity period**.

The system must automatically enforce validity dates for all commercial terms.

Expired commercial structures remain available for historical reference only and **cannot affect new settlements**.

---

## Implementation reference

See [COMMERCIAL_AGREEMENT_SUMMARY_AUDIT.md](./COMMERCIAL_AGREEMENT_SUMMARY_AUDIT.md) for codebase mapping and CAE alignment.
