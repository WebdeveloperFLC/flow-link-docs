/** Company-standard invoice math (matches client registration flow). */

export type DiscountMode = "amount" | "percentage";

/** Whether GST is calculated on discounted lines or on gross before discounts. */
export type TaxBasis = "after_discount" | "before_discount";

export type LineDiscountInput = {
  mode: DiscountMode;
  /** Raw value: currency amount or percentage (0–100). */
  value: number;
};

export type LinePricingInput = {
  unit: number;
  qty: number;
  discount: LineDiscountInput;
};

export type OfferDiscountInput = {
  discount_type: "percentage" | "fixed" | string;
  discount_value: number;
  max_discount_amount?: number | null;
};

export function normalizeDiscountInput(
  raw?: Partial<LineDiscountInput> | null,
  legacyFlatAmount?: number | null,
): LineDiscountInput {
  if (raw?.mode && raw.value != null && !Number.isNaN(Number(raw.value))) {
    return { mode: raw.mode, value: Math.max(0, Number(raw.value)) };
  }
  const flat = Number(legacyFlatAmount ?? 0);
  if (flat > 0) return { mode: "amount", value: flat };
  return { mode: "amount", value: 0 };
}

/** Flat discount amount from gross using mode + value. */
export function resolveLineDiscountAmount(gross: number, discount: LineDiscountInput): number {
  if (gross <= 0 || discount.value <= 0) return 0;
  if (discount.mode === "percentage") {
    const pct = Math.min(100, Math.max(0, discount.value));
    return Math.min(gross, (gross * pct) / 100);
  }
  return Math.min(gross, discount.value);
}

export function computeOfferDiscountAmount(
  subtotalAfterLineDiscounts: number,
  offer: OfferDiscountInput | null | undefined,
): number {
  if (!offer || subtotalAfterLineDiscounts <= 0) return 0;
  let d =
    offer.discount_type === "percentage"
      ? (subtotalAfterLineDiscounts * offer.discount_value) / 100
      : offer.discount_value;
  if (offer.max_discount_amount != null) {
    d = Math.min(d, offer.max_discount_amount);
  }
  return Math.max(0, Math.min(d, subtotalAfterLineDiscounts));
}

export type ComputedInvoiceLine = {
  gross: number;
  lineDiscountAmount: number;
  netBeforeOffer: number;
  offerShare: number;
  taxable: number;
  tax: number;
  total: number;
  discount: LineDiscountInput;
};

export function computeInvoiceLines(
  lines: LinePricingInput[],
  offerDiscount: number,
  gstEnabled: boolean,
  gstRate: number,
  checkoutDiscount: LineDiscountInput = { mode: "amount", value: 0 },
  taxBasis: TaxBasis = "after_discount",
): {
  lines: ComputedInvoiceLine[];
  subtotalAfterLineDiscounts: number;
  offerDiscountApplied: number;
  taxableTotal: number;
  gstTotal: number;
  grandTotalBeforeCheckout: number;
  checkoutDiscountApplied: number;
  grandTotal: number;
} {
  const computed = lines.map((line) => {
    const gross = Math.max(0, line.unit * line.qty);
    const lineDiscountAmount = resolveLineDiscountAmount(gross, line.discount);
    const netBeforeOffer = Math.max(0, gross - lineDiscountAmount);
    return { ...line, gross, lineDiscountAmount, netBeforeOffer };
  });

  const subtotalAfterLineDiscounts = computed.reduce((s, l) => s + l.netBeforeOffer, 0);
  const grossTotal = computed.reduce((s, l) => s + l.gross, 0);
  const offerDiscountApplied = Math.min(Math.max(0, offerDiscount), subtotalAfterLineDiscounts);
  const taxableTotal =
    taxBasis === "before_discount"
      ? grossTotal
      : Math.max(0, subtotalAfterLineDiscounts - offerDiscountApplied);

  const withOffer = computed.map((line) => {
    const offerShare =
      subtotalAfterLineDiscounts > 0
        ? (line.netBeforeOffer / subtotalAfterLineDiscounts) * offerDiscountApplied
        : 0;

    if (taxBasis === "before_discount") {
      const taxable = line.gross;
      const tax = gstEnabled ? taxable * (gstRate / 100) : 0;
      const total = Math.max(0, line.gross + tax - line.lineDiscountAmount - offerShare);
      return {
        gross: line.gross,
        lineDiscountAmount: line.lineDiscountAmount,
        netBeforeOffer: line.netBeforeOffer,
        offerShare,
        taxable,
        tax: Number(tax.toFixed(2)),
        total: Number(total.toFixed(2)),
        discount: line.discount,
      };
    }

    const taxable = Math.max(0, line.netBeforeOffer - offerShare);
    const tax = gstEnabled ? taxable * (gstRate / 100) : 0;
    const total = taxable + tax;
    return {
      gross: line.gross,
      lineDiscountAmount: line.lineDiscountAmount,
      netBeforeOffer: line.netBeforeOffer,
      offerShare,
      taxable,
      tax: Number(tax.toFixed(2)),
      total: Number(total.toFixed(2)),
      discount: line.discount,
    };
  });

  const gstTotal = withOffer.reduce((s, l) => s + l.tax, 0);
  const grandTotalBeforeCheckout = withOffer.reduce((s, l) => s + l.total, 0);
  const checkoutDiscountApplied = resolveCheckoutDiscountAmount(
    grandTotalBeforeCheckout,
    checkoutDiscount,
  );

  let finalLines = withOffer;
  if (checkoutDiscountApplied > 0 && grandTotalBeforeCheckout > 0) {
    finalLines = withOffer.map((line) => {
      const share = (line.total / grandTotalBeforeCheckout) * checkoutDiscountApplied;
      return {
        ...line,
        total: Number(Math.max(0, line.total - share).toFixed(2)),
      };
    });
  }

  const grandTotal = finalLines.reduce((s, l) => s + l.total, 0);

  return {
    lines: finalLines,
    subtotalAfterLineDiscounts,
    offerDiscountApplied,
    taxableTotal,
    gstTotal: Number(gstTotal.toFixed(2)),
    grandTotalBeforeCheckout: Number(grandTotalBeforeCheckout.toFixed(2)),
    checkoutDiscountApplied: Number(checkoutDiscountApplied.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
  };
}

/** Costco-style discount on the invoice total including tax. */
export function resolveCheckoutDiscountAmount(
  totalInclTax: number,
  checkout: LineDiscountInput,
): number {
  return resolveLineDiscountAmount(totalInclTax, checkout);
}

/** Hidden line-item id used to persist checkout discount on draft invoices. */
export const CHECKOUT_DISCOUNT_META_ID = "__checkout_discount__";

export function isCheckoutDiscountMetaLine(line: { service_id?: string | null }): boolean {
  return line.service_id === CHECKOUT_DISCOUNT_META_ID;
}
