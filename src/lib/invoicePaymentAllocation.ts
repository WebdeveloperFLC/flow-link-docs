/** Helpers for per-service payment tracking and lump-sum allocation on invoices. */

export type InvoiceLineOutstanding = {
  key: string;
  line_item_key: string;
  service_id: string | null;
  total: number;
  already_paid: number;
};

export function lineItemKeyFromIndex(
  li: { service_id?: string | null; service_name?: string | null },
  idx: number,
): string {
  if (li.service_id) return `svc:${li.service_id}`;
  const slug = (li.service_name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `idx:${idx}:${slug}`;
}

/** Sum verified allocations by line_item_key (+ service_id fallback). */
export function paidByLineFromAllocations(
  allocations: Array<{
    amount_allocated?: number | null;
    line_item_key?: string | null;
    service_id?: string | null;
  }>,
): { byLineKey: Map<string, number>; byServiceId: Map<string, number> } {
  const byLineKey = new Map<string, number>();
  const byServiceId = new Map<string, number>();
  for (const a of allocations) {
    const amt = Number(a.amount_allocated || 0);
    if (a.line_item_key) {
      byLineKey.set(a.line_item_key, (byLineKey.get(a.line_item_key) ?? 0) + amt);
    }
    if (a.service_id) {
      byServiceId.set(a.service_id, (byServiceId.get(a.service_id) ?? 0) + amt);
    }
  }
  return { byLineKey, byServiceId };
}

/**
 * Distribute a lump-sum payment across outstanding lines (proportional by balance).
 * Returns map of row key → allocated amount (invoice currency).
 */
export function distributeLumpSumAcrossLines(
  rows: InvoiceLineOutstanding[],
  amount: number,
): Map<string, number> {
  const out = new Map<string, number>();
  const eligible = rows
    .map((r) => ({ ...r, outstanding: Math.max(r.total - r.already_paid, 0) }))
    .filter((r) => r.outstanding > 0.005);
  if (!eligible.length || amount <= 0) return out;

  const cap = Math.min(amount, eligible.reduce((s, r) => s + r.outstanding, 0));
  let assigned = 0;
  eligible.forEach((r, i) => {
    const isLast = i === eligible.length - 1;
    const share = isLast
      ? Math.max(0, cap - assigned)
      : Math.min(r.outstanding, Number(((r.outstanding / eligible.reduce((s, x) => s + x.outstanding, 0)) * cap).toFixed(2)));
    const alloc = Math.min(share, r.outstanding);
    if (alloc > 0) {
      out.set(r.key, alloc);
      assigned += alloc;
    }
  });
  return out;
}
