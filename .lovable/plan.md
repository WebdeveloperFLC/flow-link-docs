## Answers to your questions

### 1. What is "Account holder name" for?
It's the **legal name printed on the bank's records** — i.e. exactly what the bank has registered for that account. In 90% of cases this is just the company's legal name (e.g. *Future Link Consultants Pvt Ltd*), so it looks like a duplicate of "Entity / company". But it diverges in real cases:

- Joint / in-trust accounts: *"Future Link Consultants Pvt Ltd A/c Payroll Trust"*
- DBA / trade name on the account: *"FLC Education (a unit of Future Link Consultants Pvt Ltd)"*
- Escrow / nominee accounts: *"FLC Pvt Ltd — Client Escrow"*
- Branch-titled accounts where the bank prints the branch name

So: **Entity = who owns it on your books**, **Account holder name = what the bank prints on the statement**. Keeping them separate avoids reconciliation mismatches when bank statements are imported.

### 2. How does "Sub-entity / division" work and where do you create one?
The dropdown lists **child entities of the selected company** — pulled from the same Entities screen you already use (`/accounting/settings/entities`).

You already have the field to create them — you just didn't see it in the screenshot you sent. In the **Add entity** dialog there is a **Parent** dropdown (currently set to *"— None (top-level) —"* in your screenshot). To create a sub-entity:

1. Go to *Accounting → Settings → Entities → Add entity*
2. Set **Type** = `BRANCH` or `SUB_BRANCH`
3. Set **Parent** = the company it belongs to (e.g. *Future Link Consultants Pvt Ltd*)
4. Save

That new branch will then appear in the "Sub-entity / division" dropdown on the bank account form whenever you pick its parent company.

It's blank right now simply because none of your 8 companies have any child entities created yet.

---

## Proposed UI fixes (small, labelling/helper only)

**A. Bank account form — `BankAccountFormDialog.tsx`**
- When the chosen company has **zero sub-entities**, replace the disabled "No branches" placeholder with a helpful inline hint:
  *"No sub-entities for this company. Add one in Settings → Entities (Parent = this company)."*
  Include a link/button that opens `/accounting/settings/entities` in a new tab.
- Tighten the helper under "Account holder name" to: *"Legal name as printed on the bank's records. Usually the company's legal name, but can differ for joint, escrow, DBA, or trust accounts."*

**B. Entities page — `AccountingEntitiesPage.tsx` / `EntityFormDialog.tsx`**
- Update the dialog description from generic *"Companies, branches, sub-branches, and brands…"* to a clearer one-liner: *"To create a branch or division of an existing company, set Type = BRANCH/SUB_BRANCH and pick its Parent company below."*
- On the Entities list page subtitle, add a small note: *"Add branches/divisions by setting a Parent on a new entity."*

**Out of scope:** no schema changes, no changes to the bank store, no removal/rename of existing fields, no changes to other modules.

Want me to apply these labelling tweaks?
