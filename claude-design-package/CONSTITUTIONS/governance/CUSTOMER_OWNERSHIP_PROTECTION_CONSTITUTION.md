# FLEOS Constitution — Customer Ownership Protection Policy

**Status:** ❄️ Frozen  
**Effective:** Sprint 4+ (all settlement, commission, referral, incentive, bonus paths)

---

## Principle

Future Link's existing customers are protected assets. No referral fee, incentive, commission, acquisition bonus, or revenue-sharing payment shall be generated for an **existing Future Link customer** unless an **authorized override** is approved through the configured workflow.

---

## Automatic Eligibility Check

Before any settlement, commission, referral, incentive, or bonus is calculated, the **Customer Attribution Engine** must verify:

1. Is this already an existing Future Link customer?
2. Is this customer already assigned to Future Link?
3. Is this customer continuing an existing relationship?
4. Is this customer already covered under another active commercial agreement?

If **YES** → `Status = Not Eligible` → no settlement → no payment.

---

## Override Authority

Only **Super Admin** or **Accountant / Finance Admin** (configurable) may approve exceptions.  
No direct edit. **Override Workflow** required.

---

## Override Workflow

```
Existing Customer Detected → Settlement Blocked → Override Request
→ Business Reason (mandatory) → Supporting Documents (optional)
→ Approval → Settlement Released → Complete Audit Trail
```

---

## Mandatory Audit (immutable)

Customer · Agreement · Original ownership · Reason · Approver · Date/time · Previous/new decision · Documents · **Business Event ID**

---

## Dashboard Alerts

Executive Dashboard must surface: override approved/rejected, referral blocked, duplicate referral, ownership conflict.

---

## Fraud Protection (automatic block)

- Existing student submitted as "new" referral
- Continuing student claimed as referral
- Existing client under another agreement
- Multiple parties claiming same customer
- Duplicate referral submissions

---

## Constitutional Rule

Counselors, partners, freelancers, branch users, and **managers** cannot change ownership or override eligibility. Only authorized financial administrators via workflow.

---

## Implementation reference

See [CUSTOMER_OWNERSHIP_PROTECTION_AUDIT.md](./CUSTOMER_OWNERSHIP_PROTECTION_AUDIT.md) for codebase audit and platform reuse plan.
