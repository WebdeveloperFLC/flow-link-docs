export type BillStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "PAID" | "OVERDUE" | "VOID";

export type ExpenseCategory =
  | "RENT_UTILITIES"
  | "SALARIES_PAYROLL"
  | "TECHNOLOGY_SOFTWARE"
  | "TRAVEL_TRANSPORT"
  | "MARKETING_ADVERTISING"
  | "PROFESSIONAL_FEES"
  | "BANK_CHARGES"
  | "GOVERNMENT_FEES"
  | "OFFICE_SUPPLIES"
  | "TELECOMS"
  | "COACHING_MATERIALS"
  | "EXAM_FEES"
  | "VISA_FILING_COSTS"
  | "UNIVERSITY_LIAISON_FEES"
  | "INSURANCE"
  | "MAINTENANCE"
  | "OTHER";

export interface VendorBill {
  id: string;
  billNumber: string;
  vendor: string;
  vendorEmail?: string;
  vendorPhone?: string;
  vendorCategory: ExpenseCategory;
  entity: string;
  branch: string;
  branchCountry: "CA" | "US" | "IN" | "AE" | "OTHER";
  department?: string;
  description: string;
  billDate: string;
  dueDate: string;
  currency: "CAD" | "USD" | "INR" | "AED" | "GBP" | "AUD" | "EUR";
  subtotal: number;
  taxCode: string;
  taxAmount: number;
  totalAmount: number;
  status: BillStatus;
  linkedDocumentId?: string;
  linkedJournalId?: string;
  linkedPaymentJournalId?: string;
  linkedBankAccountId?: string;
  linkedCOACode: string;
  linkedExpenseCOACode?: string;
  paymentDate?: string;
  paymentReference?: string;
  paymentProofPath?: string;
  paymentMethod?: "BANK_TRANSFER" | "CHEQUE" | "CASH" | "CREDIT_CARD" | "UPI" | "WIRE" | "OTHER";
  notes?: string;
  daysOverdue?: number;
  createdBy: string;
  approvedBy?: string;
  tags?: string[];
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  RENT_UTILITIES: "Rent & utilities",
  SALARIES_PAYROLL: "Salaries & payroll",
  TECHNOLOGY_SOFTWARE: "Technology & software",
  TRAVEL_TRANSPORT: "Travel & transport",
  MARKETING_ADVERTISING: "Marketing & advertising",
  PROFESSIONAL_FEES: "Professional fees",
  BANK_CHARGES: "Bank charges",
  GOVERNMENT_FEES: "Government & filing fees",
  OFFICE_SUPPLIES: "Office supplies",
  TELECOMS: "Telecoms",
  COACHING_MATERIALS: "Coaching materials",
  EXAM_FEES: "Exam fees & slots",
  VISA_FILING_COSTS: "Visa filing costs",
  UNIVERSITY_LIAISON_FEES: "University liaison fees",
  INSURANCE: "Insurance",
  MAINTENANCE: "Maintenance & repairs",
  OTHER: "Other",
};

const mk = (
  id: string,
  billNumber: string,
  vendor: string,
  cat: ExpenseCategory,
  currency: VendorBill["currency"],
  subtotal: number,
  description: string,
  status: BillStatus,
  billDate: string,
  dueDate: string,
  extras: Partial<VendorBill> = {},
): VendorBill => {
  const taxRate = currency === "INR" ? 0.18 : currency === "CAD" ? 0.13 : 0.05;
  const taxAmount = +(subtotal * taxRate).toFixed(2);
  return {
    id,
    billNumber,
    vendor,
    vendorCategory: cat,
    entity:
      extras.entity ??
      (currency === "INR"
        ? "Future Link India Pvt Ltd"
        : currency === "CAD"
          ? "Future Link Canada HQ"
          : "Future Link USA Corp"),
    branch:
      extras.branch ??
      (currency === "INR" ? "Mumbai Office" : currency === "CAD" ? "Toronto Office" : "New York Office"),
    branchCountry: extras.branchCountry ?? (currency === "INR" ? "IN" : currency === "CAD" ? "CA" : "US"),
    department: extras.department ?? "Operations",
    description,
    billDate,
    dueDate,
    currency,
    subtotal,
    taxCode: extras.taxCode ?? (currency === "INR" ? "IGST-18%" : currency === "CAD" ? "HST-13%" : "VAT-5%"),
    taxAmount,
    totalAmount: +(subtotal + taxAmount).toFixed(2),
    status,
    linkedCOACode: "2000",
    createdBy: extras.createdBy ?? "Priya Sharma",
    ...extras,
  };
};

export const MOCK_BILLS: VendorBill[] = [];
