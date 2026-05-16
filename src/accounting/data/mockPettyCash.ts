import {
  PettyBranch, PettyCashVoucher, PettyCashReplenishment, PettyCashVerification,
  PettyCategory, ApprovalLevel, PettyCashStatus,
} from "../types/pettyCash";

export const PETTY_BRANCHES: PettyBranch[] = [];

export function approvalLevelFor(amount: number): ApprovalLevel {
  if (amount < 500) return "auto";
  if (amount <= 2000) return "custodian";
  if (amount <= 5000) return "secondary";
  return "finance";
}

function step(level: ApprovalLevel, status: "pending" | "approved" | "rejected" | "skipped", by?: string, at?: string, note?: string) {
  return { level, status, by, at, note };
}

function daysAgo(n: number, hour = 12, min = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}
function dateOnly(n: number) { return daysAgo(n).slice(0, 10); }

const VENDORS = {
  flowers: ["Sundar Florists", "Rose Garden", "Bloomwala"],
  tea: ["Chaiwala Corner", "Tea Junction", "Amul Tea"],
  milk: ["Amul Dairy", "Mother Dairy", "Local Doodh"],
  labour: ["Daily Wage — Ramesh", "Daily Wage — Suresh", "Helper — Geeta"],
  repair: ["Sharma Electricals", "Quick Fix Plumbers", "AC Care"],
  water: ["Bisleri Distributor", "Aquafina Supply", "RO Service"],
  transport: ["Ola", "Uber", "Auto — Local"],
  snacks: ["Haldiram's", "Bikanervala", "Local Bakery"],
  stationery: ["Stationery Mart", "Office Plus", "Reliance Stationery"],
  courier: ["Blue Dart", "DTDC", "India Post"],
  printing: ["Quick Print", "Xerox Centre", "Print Hub"],
  employee_reimbursement: [],
  other: ["Misc Expense", "Pooja Items", "Office Supplies"],
};

const EMPLOYEES = ["Pooja Sharma", "Arjun Mehta", "Sneha Iyer", "Rohit Bansal", "Kavita Joshi", "Aman Gupta", "Rashmi Nair"];

let vCounter = 1;
function v(
  branchId: string,
  category: PettyCategory,
  amount: number,
  ago: number,
  status: PettyCashStatus,
  extras: Partial<PettyCashVoucher> = {}
): PettyCashVoucher {
  const branch = PETTY_BRANCHES.find(b => b.id === branchId)!;
  const id = `pv-${String(vCounter).padStart(4, "0")}`;
  const voucherNumber = `PV-${branch.code}-${String(vCounter).padStart(4, "0")}`;
  vCounter++;
  const required = approvalLevelFor(amount);
  const isReimb = extras.paymentType === "reimbursement";
  const paidTo = extras.paidTo
    ?? (isReimb ? extras.employeeName ?? "Employee" : VENDORS[category][Math.floor(Math.random() * VENDORS[category].length || 1)] ?? "Vendor");
  const trail: PettyCashVoucher["approvalTrail"] = [
    step("auto", "approved", branch.custodianName, daysAgo(ago, 9), "Voucher created"),
  ];
  if (status === "REJECTED") {
    trail.push(step(required, "rejected", branch.secondaryApproverName ?? "Finance", daysAgo(ago, 14), "Insufficient supporting evidence"));
  } else if (status === "APPROVED" || status === "REIMBURSED") {
    if (required === "auto") {
      trail[0].note = "Auto-approved (under ₹500)";
    } else {
      if (required === "custodian") trail.push(step("custodian", "approved", branch.custodianName, daysAgo(ago, 11)));
      if (required === "secondary") {
        trail.push(step("custodian", "approved", branch.custodianName, daysAgo(ago, 11)));
        trail.push(step("secondary", "approved", branch.secondaryApproverName ?? "Finance", daysAgo(ago, 13)));
      }
      if (required === "finance") {
        trail.push(step("custodian", "approved", branch.custodianName, daysAgo(ago, 11)));
        if (branch.secondaryApproverName) trail.push(step("secondary", "approved", branch.secondaryApproverName, daysAgo(ago, 13)));
        trail.push(step("finance", "approved", "Finance — Ritu Khanna", daysAgo(ago, 15)));
      }
    }
    if (status === "REIMBURSED") {
      trail.push(step("finance", "approved", "Finance — Ritu Khanna", daysAgo(Math.max(0, ago - 1), 12), "Reimbursement paid"));
    }
  } else {
    // PENDING
    if (required !== "auto") {
      trail.push({ level: required, status: "pending" });
    }
  }
  return {
    id, voucherNumber, branchId, category, amount,
    paidTo,
    paymentType: extras.paymentType ?? "petty_cash",
    employeeName: extras.employeeName,
    reimbursementMethod: extras.reimbursementMethod,
    date: dateOnly(ago),
    notes: extras.notes,
    receiptFileName: extras.missingReceipt ? undefined : extras.receiptFileName ?? `receipt-${id}.jpg`,
    missingReceipt: extras.missingReceipt,
    emergency: extras.emergency,
    recurring: extras.recurring,
    linkedClient: extras.linkedClient,
    linkedCounselor: extras.linkedCounselor,
    status,
    requiredLevel: required,
    approvalTrail: trail,
    flags: extras.flags,
    createdAt: daysAgo(ago, 9),
    createdBy: branch.custodianName,
  };
}

function buildVouchers(): PettyCashVoucher[] {
  const out: PettyCashVoucher[] = [];
  // Recurring tea/milk/snacks across branches
  PETTY_BRANCHES.forEach((b, idx) => {
    out.push(v(b.id, "tea", 120, 1, "APPROVED", { recurring: true }));
    out.push(v(b.id, "tea", 120, 2, "APPROVED", { recurring: true }));
    out.push(v(b.id, "milk", 80, 1, "APPROVED", { recurring: true }));
    out.push(v(b.id, "snacks", 250, 2, "APPROVED", { recurring: true }));
    if (idx % 2 === 0) out.push(v(b.id, "snacks", 240, 2, "APPROVED", { recurring: true, flags: ["snack_burst"] }));
  });
  // Larger expenses
  out.push(v("br-del", "repair", 4500, 4, "APPROVED", { notes: "AC compressor repair" }));
  out.push(v("br-mum", "repair", 6800, 6, "APPROVED", { emergency: true, notes: "Pipe burst — emergency plumber" }));
  out.push(v("br-blr", "courier", 1850, 3, "APPROVED"));
  out.push(v("br-hyd", "printing", 3200, 5, "APPROVED", { notes: "Brochure reprint" }));
  out.push(v("br-pun", "stationery", 1450, 4, "APPROVED"));
  out.push(v("br-chd", "transport", 980, 2, "APPROVED"));
  out.push(v("br-sur", "flowers", 350, 1, "APPROVED", { notes: "Reception bouquet" }));
  out.push(v("br-ahd", "labour", 1200, 3, "APPROVED", { notes: "Helper for office shift" }));
  // Pending approvals
  out.push(v("br-del", "repair", 3500, 0, "PENDING"));
  out.push(v("br-mum", "other", 2100, 0, "PENDING", { notes: "Misc office expense" }));
  out.push(v("br-blr", "transport", 1450, 1, "PENDING"));
  out.push(v("br-chd", "stationery", 720, 0, "PENDING"));
  // Employee reimbursements
  out.push(v("br-del", "employee_reimbursement", 2400, 5, "REIMBURSED", { paymentType: "reimbursement", employeeName: "Pooja Sharma", reimbursementMethod: "bank", notes: "Client lunch — credit card" }));
  out.push(v("br-mum", "employee_reimbursement", 1850, 7, "REIMBURSED", { paymentType: "reimbursement", employeeName: "Arjun Mehta", reimbursementMethod: "cash" }));
  out.push(v("br-blr", "employee_reimbursement", 3600, 4, "APPROVED", { paymentType: "reimbursement", employeeName: "Sneha Iyer", reimbursementMethod: "bank", notes: "Travel reimbursement" }));
  out.push(v("br-hyd", "employee_reimbursement", 1200, 2, "PENDING", { paymentType: "reimbursement", employeeName: "Rohit Bansal", reimbursementMethod: "bank" }));
  out.push(v("br-pun", "employee_reimbursement", 5400, 6, "APPROVED", { paymentType: "reimbursement", employeeName: "Kavita Joshi", reimbursementMethod: "bank", flags: ["repeated_reimb"] }));
  out.push(v("br-pun", "employee_reimbursement", 4800, 9, "APPROVED", { paymentType: "reimbursement", employeeName: "Kavita Joshi", reimbursementMethod: "bank", flags: ["repeated_reimb"] }));
  // Suspicious entries
  out.push(v("br-ahd", "other", 5000, 4, "APPROVED", { flags: ["round_number", "excess_other"], notes: "Other expense — round number" }));
  out.push(v("br-del", "repair", 2000, 7, "APPROVED", { flags: ["round_number"] }));
  out.push(v("br-blr", "courier", 450, 8, "APPROVED", { flags: ["duplicate"], notes: "Courier — Blue Dart" }));
  out.push(v("br-blr", "courier", 450, 8, "APPROVED", { flags: ["duplicate"], notes: "Courier — Blue Dart" }));
  out.push(v("br-chd", "snacks", 380, 1, "APPROVED", { missingReceipt: true }));
  out.push(v("br-mum", "transport", 220, 3, "APPROVED", { missingReceipt: true }));
  out.push(v("br-hyd", "repair", 5500, 11, "APPROVED", { emergency: true, flags: ["excess_emergency", "repeated_repair"], notes: "Emergency electrician" }));
  out.push(v("br-hyd", "repair", 4200, 14, "APPROVED", { emergency: true, flags: ["repeated_repair"] }));
  // Rejected
  out.push(v("br-pun", "other", 2800, 10, "REJECTED", { notes: "Insufficient documentation" }));
  out.push(v("br-sur", "transport", 3100, 12, "REJECTED"));
  // More variety
  out.push(v("br-ahd", "courier", 280, 5, "APPROVED"));
  out.push(v("br-del", "stationery", 690, 6, "APPROVED"));
  out.push(v("br-mum", "flowers", 180, 8, "APPROVED"));
  out.push(v("br-pun", "water", 320, 3, "APPROVED", { recurring: true }));
  out.push(v("br-chd", "water", 280, 2, "APPROVED", { recurring: true }));
  out.push(v("br-sur", "printing", 850, 7, "APPROVED"));
  out.push(v("br-blr", "labour", 900, 9, "APPROVED"));
  out.push(v("br-hyd", "snacks", 410, 5, "APPROVED"));
  out.push(v("br-ahd", "transport", 540, 6, "APPROVED"));
  out.push(v("br-del", "labour", 1100, 8, "APPROVED"));
  out.push(v("br-mum", "stationery", 480, 11, "APPROVED"));
  return out;
}

export const PETTY_VOUCHERS: PettyCashVoucher[] = [];

export const PETTY_REPLENISHMENTS: PettyCashReplenishment[] = [];

export const PETTY_VERIFICATIONS: PettyCashVerification[] = [];

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