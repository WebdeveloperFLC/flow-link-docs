import type { HolidayRow } from "./types";

/** Branch ids for a holiday (multi-branch + legacy branch_id). Empty = all branches. */
export function holidayBranchIds(h: HolidayRow): string[] {
  if (h.branch_ids?.length) return h.branch_ids;
  if (h.branch_id) return [h.branch_id];
  return [];
}

export function holidayAppliesToBranch(h: HolidayRow, branchId: string): boolean {
  const ids = holidayBranchIds(h);
  if (ids.length === 0) return true;
  return ids.includes(branchId);
}

export function formatHolidayBranches(
  h: HolidayRow,
  branchesById: Record<string, { name: string }>,
): string {
  const ids = holidayBranchIds(h);
  if (ids.length === 0) return "All branches";
  return ids.map((id) => branchesById[id]?.name ?? id.slice(0, 8)).join(", ");
}
