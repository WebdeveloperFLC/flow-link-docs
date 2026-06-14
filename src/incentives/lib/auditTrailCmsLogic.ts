import { formatApprovalAge } from "./approvalQueueLogic";

export type AuditActionType = "create" | "edit" | "approve" | "reject" | "consume" | "allocate";

export type AuditSourceModule = "wallet" | "offers" | "approvals" | "currency" | "promotions";

export interface CommercialAuditEvent {
  id: string;
  sourceId: string;
  sourceModule: AuditSourceModule;
  action: AuditActionType;
  actionLabel: string;
  actorName: string;
  objectLabel: string;
  meta: string;
  occurredAt: string;
  timeLabel: string;
}

export interface AuditActionCount {
  action: AuditActionType;
  label: string;
  count: number;
  color: string;
}

export interface AuditTrailCmsKpis {
  totalEvents: number;
  created: number;
  approved: number;
  rejected: number;
  consumed: number;
}

const ACTION_LABELS: Record<AuditActionType, string> = {
  create: "Created",
  edit: "Edited",
  approve: "Approved",
  reject: "Rejected",
  consume: "Consumed",
  allocate: "Allocated",
};

const ACTION_COLORS: Record<AuditActionType, string> = {
  create: "var(--cash)",
  edit: "var(--amber, #d97706)",
  approve: "var(--blue)",
  reject: "var(--destructive, #dc2626)",
  consume: "var(--teal, #0d9488)",
  allocate: "var(--wallet, var(--blue))",
};

function eventBase(
  id: string,
  sourceId: string,
  sourceModule: AuditSourceModule,
  action: AuditActionType,
  actorName: string,
  objectLabel: string,
  meta: string,
  occurredAt: string,
  now = Date.now(),
): CommercialAuditEvent {
  return {
    id,
    sourceId,
    sourceModule,
    action,
    actionLabel: ACTION_LABELS[action],
    actorName: actorName || "System",
    objectLabel,
    meta,
    occurredAt,
    timeLabel: formatApprovalAge(occurredAt, now),
  };
}

export function mapDiscountApprovalAuditRows(
  rows: {
    id: string;
    discount_amount: number;
    discount_percent: number | null;
    status: string;
    created_at: string;
    reviewed_at: string | null;
    review_note: string | null;
    counselor?: { full_name: string | null } | null;
    reviewer?: { full_name: string | null } | null;
    client?: { full_name: string | null } | null;
  }[],
  now = Date.now(),
): CommercialAuditEvent[] {
  const events: CommercialAuditEvent[] = [];
  for (const row of rows) {
    const client = row.client?.full_name ?? "Client";
    const pct = row.discount_percent != null ? `${row.discount_percent}%` : "discount";
    const objectLabel = `Discount ${pct} · ${client}`;
    events.push(
      eventBase(
        `disc-create-${row.id}`,
        row.id,
        "approvals",
        "create",
        row.counselor?.full_name ?? "Counselor",
        objectLabel,
        `₹${Number(row.discount_amount).toLocaleString("en-IN")} submitted for approval`,
        row.created_at,
        now,
      ),
    );
    if (row.reviewed_at && row.status === "approved") {
      events.push(
        eventBase(
          `disc-approve-${row.id}`,
          row.id,
          "approvals",
          "approve",
          row.reviewer?.full_name ?? "Reviewer",
          objectLabel,
          row.review_note?.trim() || "Discount approved and applied",
          row.reviewed_at,
          now,
        ),
      );
    }
    if (row.reviewed_at && row.status === "declined") {
      events.push(
        eventBase(
          `disc-reject-${row.id}`,
          row.id,
          "approvals",
          "reject",
          row.reviewer?.full_name ?? "Reviewer",
          objectLabel,
          row.review_note?.trim() || "Request declined",
          row.reviewed_at,
          now,
        ),
      );
    }
  }
  return events;
}

export function mapWalletExceptionAuditRows(
  rows: {
    id: string;
    requested_amount: number;
    reason: string;
    status: string;
    created_at: string;
    reviewed_at: string | null;
    review_note: string | null;
    counselor?: { full_name: string | null } | null;
    reviewer?: { full_name: string | null } | null;
  }[],
  now = Date.now(),
): CommercialAuditEvent[] {
  const events: CommercialAuditEvent[] = [];
  for (const row of rows) {
    const objectLabel = "Wallet exception";
    events.push(
      eventBase(
        `wx-create-${row.id}`,
        row.id,
        "approvals",
        "create",
        row.counselor?.full_name ?? "Counselor",
        objectLabel,
        `₹${Number(row.requested_amount).toLocaleString("en-IN")} · ${row.reason.slice(0, 80)}`,
        row.created_at,
        now,
      ),
    );
    if (row.reviewed_at && row.status === "approved") {
      events.push(
        eventBase(
          `wx-approve-${row.id}`,
          row.id,
          "approvals",
          "approve",
          row.reviewer?.full_name ?? "Reviewer",
          objectLabel,
          row.review_note?.trim() || "Exception approved",
          row.reviewed_at,
          now,
        ),
      );
    }
    if (row.reviewed_at && row.status === "declined") {
      events.push(
        eventBase(
          `wx-reject-${row.id}`,
          row.id,
          "approvals",
          "reject",
          row.reviewer?.full_name ?? "Reviewer",
          objectLabel,
          row.review_note?.trim() || "Exception declined",
          row.reviewed_at,
          now,
        ),
      );
    }
  }
  return events;
}

export function mapWalletLedgerAuditRows(
  rows: {
    id: string;
    entry_type: string;
    amount: number;
    currency: string;
    note: string | null;
    created_at: string;
    wallet?: { name: string | null } | null;
  }[],
  now = Date.now(),
): CommercialAuditEvent[] {
  return rows.map((row) => {
    const walletName = row.wallet?.name ?? "Wallet";
    const isConsume = row.entry_type === "allocation" && row.amount < 0;
    const action: AuditActionType = row.entry_type === "topup" ? "allocate" : isConsume ? "consume" : "edit";
    const signed = `${row.currency} ${Math.abs(row.amount).toLocaleString("en-IN")}`;
    return eventBase(
      `wl-${row.id}`,
      row.id,
      "wallet",
      action,
      "System",
      walletName,
      row.note?.trim() || `${row.entry_type} · ${signed}`,
      row.created_at,
      now,
    );
  });
}

export function mapOfferStatusAuditRows(
  rows: {
    id: string;
    from_status: string | null;
    to_status: string;
    note: string | null;
    created_at: string;
    offer?: { title: string | null } | null;
    author?: { full_name: string | null } | null;
  }[],
  now = Date.now(),
): CommercialAuditEvent[] {
  return rows.map((row) => {
    const title = row.offer?.title ?? "Offer";
    const action: AuditActionType =
      row.to_status === "active" || row.to_status === "approved" ? "approve" : "edit";
    return eventBase(
      `offer-${row.id}`,
      row.id,
      "offers",
      action,
      row.author?.full_name ?? "Staff",
      title,
      `${row.from_status ?? "new"} → ${row.to_status}${row.note ? ` · ${row.note}` : ""}`,
      row.created_at,
      now,
    );
  });
}

export function mapFxAuditRows(
  rows: {
    id: string;
    action: string;
    changed_at: string;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    author?: { full_name: string | null } | null;
  }[],
  now = Date.now(),
): CommercialAuditEvent[] {
  return rows.map((row) => {
    const currency = String(row.new_values?.currency ?? row.old_values?.currency ?? "FX");
    const action: AuditActionType =
      row.action === "INSERT" ? "create" : row.action === "DELETE" ? "reject" : "edit";
    const rate = row.new_values?.rate_to_inr ?? row.new_values?.base_rate_to_inr;
    const meta =
      rate != null
        ? `${currency} rate → ${Number(rate).toFixed(2)} INR`
        : `${row.action} on ${currency}`;
    return eventBase(
      `fx-${row.id}`,
      row.id,
      "currency",
      action,
      row.author?.full_name ?? "Admin",
      `${currency} FX rate`,
      meta,
      row.changed_at,
      now,
    );
  });
}

export function mapPromotionAuditRows(
  rows: {
    id: string;
    title: string;
    status: string;
    created_at: string;
    reviewed_at: string | null;
    review_note: string | null;
    requester?: { full_name: string | null } | null;
    reviewer?: { full_name: string | null } | null;
  }[],
  now = Date.now(),
): CommercialAuditEvent[] {
  const events: CommercialAuditEvent[] = [];
  for (const row of rows) {
    events.push(
      eventBase(
        `promo-create-${row.id}`,
        row.id,
        "promotions",
        "create",
        row.requester?.full_name ?? "Staff",
        row.title,
        "Promotion proposal submitted",
        row.created_at,
        now,
      ),
    );
    if (row.reviewed_at && (row.status === "approved" || row.status === "published")) {
      events.push(
        eventBase(
          `promo-approve-${row.id}`,
          row.id,
          "promotions",
          "approve",
          row.reviewer?.full_name ?? "Reviewer",
          row.title,
          row.review_note?.trim() || "Promotion approved",
          row.reviewed_at,
          now,
        ),
      );
    }
    if (row.reviewed_at && row.status === "rejected") {
      events.push(
        eventBase(
          `promo-reject-${row.id}`,
          row.id,
          "promotions",
          "reject",
          row.reviewer?.full_name ?? "Reviewer",
          row.title,
          row.review_note?.trim() || "Promotion rejected",
          row.reviewed_at,
          now,
        ),
      );
    }
  }
  return events;
}

export function mergeAuditEvents(...groups: CommercialAuditEvent[][]): CommercialAuditEvent[] {
  return groups
    .flat()
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export function filterAuditEvents(
  items: CommercialAuditEvent[],
  action: AuditActionType | "all",
): CommercialAuditEvent[] {
  if (action === "all") return items;
  return items.filter((i) => i.action === action);
}

export function auditActionCounts(items: CommercialAuditEvent[]): AuditActionCount[] {
  const counts: Record<AuditActionType, number> = {
    create: 0,
    edit: 0,
    approve: 0,
    reject: 0,
    consume: 0,
    allocate: 0,
  };
  for (const item of items) counts[item.action] += 1;
  return (Object.keys(counts) as AuditActionType[])
    .filter((action) => counts[action] > 0)
    .map((action) => ({
      action,
      label: ACTION_LABELS[action],
      count: counts[action],
      color: ACTION_COLORS[action],
    }))
    .sort((a, b) => b.count - a.count);
}

export function auditTrailCmsKpis(items: CommercialAuditEvent[]): AuditTrailCmsKpis {
  return {
    totalEvents: items.length,
    created: items.filter((i) => i.action === "create").length,
    approved: items.filter((i) => i.action === "approve").length,
    rejected: items.filter((i) => i.action === "reject").length,
    consumed: items.filter((i) => i.action === "consume").length,
  };
}

export function auditActionColor(action: AuditActionType): string {
  return ACTION_COLORS[action];
}
