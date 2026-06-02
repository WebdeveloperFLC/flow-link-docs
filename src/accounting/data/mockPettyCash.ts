import { ApprovalLevel } from "../types/pettyCash";

export function approvalLevelFor(amount: number): ApprovalLevel {
  if (amount < 500) return "auto";
  if (amount <= 2000) return "custodian";
  if (amount <= 5000) return "secondary";
  return "finance";
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

export function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth();
}
