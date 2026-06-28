export type ApprovalCategoryId =
  | "leave"
  | "compoff"
  | "late"
  | "mispunch"
  | "training"
  | "payroll";

export type ApprovalStatusFilter = "Pending" | "Approved" | "Rejected" | "All";

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
  return status === filter;
}
