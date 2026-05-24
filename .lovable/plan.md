## Goal

In the Record Payment dialog (`ClientInvoicesPanel.tsx`), make the proof attachment strictly mandatory for every non-cash payment method (bank transfer, wire, UPI, cheque, card, e-transfer). Remove the admin override that currently allows posting without proof.

## Changes (single file: `src/components/clients/ClientInvoicesPanel.tsx`)

1. Remove the `adminOverride` state, its checkbox UI, and all references in the proof block.
2. Recompute `proofMissing` as simply `proofRequired && !proofFile` (no override branch).
3. Remove the override branch from `willBeAwaitingVerification` / save flow — non-cash payments always go through proof upload and `awaiting_verification` status as today.
4. Update the proof label to clearly mark required (`Payment proof *` with a small helper line: "Required for all non-cash payment methods.").
5. Update the Post button's disabled logic and label to drop override-dependent branches.
6. Toast message on missing proof: "Attach a payment proof to continue."

## Out of scope

- Receipt generation dialog — unchanged.
- Cash mode — proof remains optional.
- No DB or RLS changes.
