export type TaxStatus = "FILED" | "OPEN" | "LATE" | "DUE_SOON";
export type TaxType =
  | "GST_HST"
  | "GSTR_3B"
  | "TDS"
  | "SALES_TAX";

export interface TaxFiling {
  id: string;
  entityId: string;
  entityName: string;
  country: "CA" | "US" | "IN";
  taxType: TaxType;
  taxTypeLabel: string;
  period: string;
  amount: number;
  currency: "CAD" | "USD" | "INR";
  dueDate: string; // ISO
  filedDate?: string;
  status: TaxStatus;
}

export type NoticeStatus = "OPEN" | "RESPONDED" | "CLOSED";

export interface ComplianceNotice {
  id: string;
  entityId: string;
  entityName: string;
  authority: string;
  noticeNumber: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  currency: "CAD" | "USD" | "INR";
  status: NoticeStatus;
  linkedDocument?: string;
  notes?: string;
}