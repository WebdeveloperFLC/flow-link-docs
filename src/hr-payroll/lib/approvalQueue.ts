export type ApprovalCategoryId =
  | "leave"
  | "compoff"
  | "late"
  | "mispunch"
  | "training"
  | "payroll";

export type ApprovalStatusFilter =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Clarification Required"
  | "All";

export const CLARIFICATION_STATUSES = [
  "Clarification Required",
  "Pending Employee Response",
] as const;

export function isClarificationStatus(status: string): boolean {
  return (CLARIFICATION_STATUSES as readonly string[]).includes(status);
}

export function isPendingApprovalStatus(category: ApprovalCategoryId, status: string): boolean {
  if (category === "training") {
    return status === "Pending Manager Approval" || status === "Pending HR Approval";
  }
  if (category === "payroll") return status === "Pending";
  return status === "Pending";
}

export function isApprovedApprovalStatus(category: ApprovalCategoryId, status: string): boolean {
  if (category === "training") return status === "Completed";
  return status === "Approved";
}

export function matchesApprovalStatusFilter(
  category: ApprovalCategoryId,
  status: string,
  filter: ApprovalStatusFilter,
): boolean {
  if (filter === "All") return true;
  if (filter === "Pending") return isPendingApprovalStatus(category, status);
  if (filter === "Approved") return isApprovedApprovalStatus(category, status);
  if (filter === "Rejected") return status === "Rejected";
  if (filter === "Clarification Required") return isClarificationStatus(status);
  return status === filter;
}

export function approvalStatusDisplay(status: string): string {
  if (status === "Clarification Required") return "Clarification Required";
  if (status === "Pending Employee Response") return "Pending Employee Response";
  return status;
}
