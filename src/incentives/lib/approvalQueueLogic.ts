export type ApprovalStage = "auto" | "manager" | "director" | "multi_level";
export type ApprovalRisk = "low" | "med" | "high";
export type ApprovalKind = "discount" | "wallet_exception";

export interface UnifiedApprovalItem {
  id: string;
  shortId: string;
  kind: ApprovalKind;
  itemLabel: string;
  amount: number | null;
  currency: string;
  requesterName: string;
  requesterInitials: string;
  stage: ApprovalStage;
  stageLabel: string;
  risk: ApprovalRisk;
  ageLabel: string;
  createdAt: string;
  note?: string | null;
}

export interface ApprovalStageMeta {
  id: ApprovalStage;
  title: string;
  subtitle: string;
  count: number;
}

const STAGE_LABELS: Record<ApprovalStage, string> = {
  auto: "Auto-approve",
  manager: "Manager approval",
  director: "Director approval",
  multi_level: "Multi-level",
};

export function approvalShortId(id: string, prefix = "AP"): string {
  return `${prefix}-${id.replace(/-/g, "").slice(-4).toUpperCase()}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function formatApprovalAge(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  if (ms < 0) return "now";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function discountApprovalStage(input: {
  approval_level: string;
  below_floor: boolean;
  is_waiver: boolean;
  discount_percent: number | null;
}): ApprovalStage {
  if (input.is_waiver || input.below_floor) return "director";
  if (input.approval_level === "admin") return "director";
  if (input.approval_level === "manager") return "manager";
  if ((input.discount_percent ?? 0) <= 10) return "auto";
  return "manager";
}

export function discountApprovalRisk(input: {
  is_waiver: boolean;
  below_floor: boolean;
  discount_percent: number | null;
  discount_amount: number;
}): ApprovalRisk {
  if (input.is_waiver || input.below_floor) return "high";
  if ((input.discount_percent ?? 0) >= 22 || input.discount_amount >= 100000) return "high";
  if ((input.discount_percent ?? 0) >= 15 || input.discount_amount >= 40000) return "med";
  return "low";
}

export function walletExceptionStage(): ApprovalStage {
  return "multi_level";
}

export function walletExceptionRisk(amount: number): ApprovalRisk {
  if (amount >= 500000) return "high";
  if (amount >= 100000) return "med";
  return "low";
}

export function mapDiscountApproval(row: {
  id: string;
  discount_amount: number;
  discount_percent: number | null;
  approval_level: string;
  below_floor: boolean;
  is_waiver: boolean;
  request_note: string | null;
  created_at: string;
  counselor?: { full_name: string | null } | null;
  client?: { full_name: string | null } | null;
  offer?: { title: string | null } | null;
}): UnifiedApprovalItem {
  const requesterName = row.counselor?.full_name ?? "Counselor";
  const clientLabel = row.client?.full_name ?? "Client";
  const offerLabel = row.offer?.title ? ` · ${row.offer.title}` : "";
  const pctLabel = row.discount_percent != null ? `${row.discount_percent}%` : "";
  const stage = discountApprovalStage(row);

  return {
    id: row.id,
    shortId: approvalShortId(row.id),
    kind: "discount",
    itemLabel: `Discount ${pctLabel} · ${clientLabel}${offerLabel}`.trim(),
    amount: row.discount_amount,
    currency: "INR",
    requesterName,
    requesterInitials: initials(requesterName),
    stage,
    stageLabel: STAGE_LABELS[stage],
    risk: discountApprovalRisk(row),
    ageLabel: formatApprovalAge(row.created_at),
    createdAt: row.created_at,
    note: row.request_note,
  };
}

export function mapWalletExceptionApproval(row: {
  id: string;
  requested_amount: number;
  reason: string;
  created_at: string;
  counselor?: { full_name: string | null } | null;
}): UnifiedApprovalItem {
  const requesterName = row.counselor?.full_name ?? "Counselor";
  const stage = walletExceptionStage();

  return {
    id: row.id,
    shortId: approvalShortId(row.id, "WX"),
    kind: "wallet_exception",
    itemLabel: `Wallet top-up · ${row.reason.slice(0, 48)}`,
    amount: row.requested_amount,
    currency: "INR",
    requesterName,
    requesterInitials: initials(requesterName),
    stage,
    stageLabel: STAGE_LABELS[stage],
    risk: walletExceptionRisk(row.requested_amount),
    ageLabel: formatApprovalAge(row.created_at),
    createdAt: row.created_at,
    note: row.reason,
  };
}

export function buildApprovalQueue(
  discounts: Parameters<typeof mapDiscountApproval>[0][],
  walletExceptions: Parameters<typeof mapWalletExceptionApproval>[0][],
): UnifiedApprovalItem[] {
  return [
    ...discounts.map(mapDiscountApproval),
    ...walletExceptions.map(mapWalletExceptionApproval),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function approvalStageCounts(items: UnifiedApprovalItem[]): ApprovalStageMeta[] {
  const counts: Record<ApprovalStage, number> = {
    auto: 0,
    manager: 0,
    director: 0,
    multi_level: 0,
  };
  for (const item of items) counts[item.stage] += 1;

  return [
    { id: "auto", title: "Auto-approve", subtitle: "Within counselor limits", count: counts.auto },
    { id: "manager", title: "Manager", subtitle: "Above branch threshold", count: counts.manager },
    { id: "director", title: "Director", subtitle: "High value / override", count: counts.director },
    { id: "multi_level", title: "Multi-level", subtitle: "Policy / plan changes", count: counts.multi_level },
  ];
}

export function filterApprovalQueue(
  items: UnifiedApprovalItem[],
  stage: ApprovalStage | "all",
): UnifiedApprovalItem[] {
  if (stage === "all") return items;
  return items.filter((i) => i.stage === stage);
}
