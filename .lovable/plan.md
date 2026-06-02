## Problem

The "Copy Email Version" button currently pastes raw HTML markup (e.g. `<p><strong>Government / Third-party Costs:</strong> ...</p>`) into Gmail/Outlook instead of formatted rich text. This happens because `copyToClipboard` writes only `text/plain`, and `htmlToEmail` returns the HTML string as-is — so the recipient app pastes it verbatim.

## Fix

Write the cost summary to the clipboard as **both** `text/html` and `text/plain` using the async Clipboard API's `ClipboardItem`. Email clients will then consume the `text/html` flavor and render bold/lists/paragraphs as formatted text. WhatsApp and Cost Summary buttons stay unchanged (they intentionally copy plain text).

### Changes

1. `src/lib/serviceLibrary.ts`
   - Add a new helper `copyHtmlToClipboard(html: string)` that:
     - Uses `navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': plainBlob })])` where the plain flavor is generated via existing `htmlToPlain`.
     - Falls back to `navigator.clipboard.writeText(htmlToPlain(html))` if `ClipboardItem`/`clipboard.write` is unavailable, so the user still gets readable text rather than a failure.
   - Leave `htmlToEmail`, `htmlToPlain`, `htmlToWhatsApp`, and `copyToClipboard` untouched (other callers depend on them).

2. `src/pages/ServiceLibrary.tsx` (lines 496–499, Copy Email Version button only)
   - Replace `copyToClipboard(htmlToEmail(resolved.cost_summary_html))` with `copyHtmlToClipboard(htmlToEmail(resolved.cost_summary_html))`.
   - Import `copyHtmlToClipboard` from `@/lib/serviceLibrary`.

No other buttons, panels, data, or styling change.

## Verification

- Click Copy Email Version on a Canada — Study Permit record, paste into Gmail compose → bold/paragraph formatting renders, no visible `<p>`/`<strong>` tags.
- Paste into a plain-text field (e.g. terminal) → readable plain text without HTML tags.
- Copy Cost Summary and Copy WhatsApp Version still produce their existing plain-text output.
