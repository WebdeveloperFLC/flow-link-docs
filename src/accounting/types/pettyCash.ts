// Categories are now a free-form list managed in the petty-cash store.
// We keep a string type so admins can add new categories at runtime.
export type PettyCategory = string;

export interface PettyCategoryOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export const PETTY_CATEGORIES: PettyCategoryOption[] = [
  { value: "flowers", label: "Flowers" },
  { value: "tea", label: "Tea" },
  { value: "milk", label: "Milk" },
  { value: "labour", label: "Labour" },
  { value: "repair", label: "Repair" },
  { value: "water", label: "Water" },
  { value: "transport", label: "Transportation" },
  { value: "snacks", label: "Snacks" },
  { value: "stationery", label: "Stationery" },
  { value: "courier", label: "Courier" },
  { value: "printing", label: "Printing" },
  { value: "employee_reimbursement", label: "Employee reimbursement" },
  { value: "other", label: "Other" },
];

export type PettyCashStatus = "PENDING" | "APPROVED" | "REJECTED" | "REIMBURSED";
export type PaymentType = "petty_cash" | "reimbursement";
export type ReimbursementMethod = "cash" | "bank";
export type ApprovalLevel = "auto" | "custodian" | "secondary" | "finance";

export type PettyPersonRole = "custodian" | "approver" | "employee";

export interface PettyPerson {
  id: string;
  name: string;
  email?: string;
  role: PettyPersonRole;
}

export interface PettyBranch {
  id: string;
  name: string;
  code: string;
  custodianName: string;
  custodianEmail: string;
  secondaryApproverName?: string;
  openingFloat: number; // 10000 INR
  currentBalance: number;
  lastVerifiedAt?: string; // ISO
  lastVerifiedDelta?: number; // actual - expected
}

export interface ApprovalStep {
  level: ApprovalLevel;
  by?: string;
  at?: string;
  status: "pending" | "approved" | "rejected" | "skipped";
  note?: string;
}

export interface PettyCashVoucher {
  id: string;
  voucherNumber: string;
  branchId: string;
  category: PettyCategory;
  amount: number;
  paidTo: string;
  paymentType: PaymentType;
  employeeName?: string;
  reimbursementMethod?: ReimbursementMethod;
  date: string;
  notes?: string;
  receiptFileName?: string;
  missingReceipt?: boolean;
  emergency?: boolean;
  recurring?: boolean;
  linkedClient?: string;
  linkedCounselor?: string;
  status: PettyCashStatus;
  requiredLevel: ApprovalLevel;
  approvalTrail: ApprovalStep[];
  flags?: ("duplicate" | "round_number" | "excess_other" | "repeated_reimb" | "excess_emergency" | "snack_burst" | "repeated_repair")[];
  createdAt: string;
  createdBy: string;
}

export type ReplenishmentStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "PAID";

export interface PettyCashReplenishment {
  id: string;
  branchId: string;
  currentBalance: number;
  requestedAmount: number;
  approvedAmount?: number;
  status: ReplenishmentStatus;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  note?: string;
}

export interface PettyCashVerification {
  id: string;
  branchId: string;
  date: string;
  expectedCash: number;
  actualCash: number;
  delta: number;
  by: string;
  note?: string;
}