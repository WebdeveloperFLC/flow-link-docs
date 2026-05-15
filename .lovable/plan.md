## Add Future Link Consultants logo to receipts

Replace the blue "FL" placeholder square in the receipt header with the actual brand logo.

### Steps

1. **Copy the uploaded logo** to `src/assets/flc-logo.png` so it's bundled by Vite.
2. **Update `src/accounting/components/receipts/AccountingReceiptTemplate.tsx`**:
   - Import the logo: `import flcLogo from "@/assets/flc-logo.png";`
   - Replace the `<div>` with "FL" text (currently a 56x56 blue square) with an `<img src={flcLogo} alt="Future Link Consultants" />` sized at roughly `height: 56px, width: auto, maxWidth: 220px, objectFit: contain` so the full wordmark displays cleanly in both the on-screen preview and the printed PDF.
   - Keep all other layout, spacing, and inline styles untouched.

### Out of scope
- No changes to modal, helpers, or AR pages.
- No changes to other places that may use a logo (only the receipt template).

### Files
- new: `src/assets/flc-logo.png`
- modified: `src/accounting/components/receipts/AccountingReceiptTemplate.tsx`
