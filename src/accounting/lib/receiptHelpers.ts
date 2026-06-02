import type { CustomerInvoice } from "../data/mockAR";

export interface ReceiptData {
  receiptNumber: string;
  receiptDate: string;
  invoiceNumber: string;
  invoiceDate: string;
  // Company details
  companyName: string;
  companyEntity: string;
  companyBranch: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyGST?: string;
  companyLogo?: string;
  // Client details
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  passportNumber?: string;
  // Service details
  serviceType: string;
  destinationCountry?: string;
  universityName?: string;
  programName?: string;
  intakeMonth?: string;
  counselorName: string;
  coCounselorName?: string;
  /** Actual user who marked/verified the payment. Falls back to counselor when unknown. */
  receivedByName?: string;
  // Payment details
  invoiceTotal: number;
  amountPaid: number;
  outstandingBalance: number;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string;
  bankAccountNickname?: string;
  // Instalment info
  isInstalment: boolean;
  instalmentNumber?: number;
  totalInstalments?: number;
  // Tax
  subtotal: number;
  taxCode?: string;
  taxAmount: number;
}

export function generateReceiptNumber(invoiceNumber: string, paymentIndex: number = 1): string {
  const base = invoiceNumber.replace(/[^A-Z0-9]/gi, "");
  return `RCP-${base}-${paymentIndex}`;
}

/** Shape of `client_invoice_receipts.receipt_snapshot_jsonb` persisted at generation time. */
export type ReceiptSnapshotJson = {
  receipt_number?: string;
  generated_at?: string;
  generated_by_name?: string;
  posted_by_name?: string;
  entity_code?: string;
  branch_code?: string;
  invoice?: {
    invoice_number?: string;
    invoice_date?: string;
    amount?: number;
    subtotal?: number;
    tax_amount?: number;
    outstanding?: number;
    amount_paid?: number;
    currency?: string;
    line_items?: Array<{ service_name?: string; description?: string }>;
  };
  payment?: {
    amount?: number;
    currency?: string;
    paid_at?: string;
    method?: string;
    reference?: string;
    posted_by_name?: string;
    verified_by_name?: string;
  };
  client?: {
    name?: string;
    email?: string;
    phone?: string;
    assigned_counselor_name?: string;
    owner_name?: string;
  };
  firm?: { name?: string; address?: string; email?: string; phone?: string; logo_url?: string };
  branch?: { name?: string };
  footer?: { legal_name?: string; address?: string; support_email?: string; support_phone?: string };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/**
 * Build a ReceiptData object from a stored `client_invoice_receipts.receipt_snapshot_jsonb`.
 * Allows reprinting/downloading historical receipts without re-querying live data.
 * Returns null when the snapshot is missing or malformed.
 */
export function snapshotToReceiptData(snapshot: unknown): ReceiptData | null {
  const root = asRecord(snapshot);
  if (!root) return null;
  const inv = asRecord(root.invoice) ?? {};
  const pay = asRecord(root.payment) ?? {};
  const client = asRecord(root.client) ?? {};
  const firm = asRecord(root.firm) ?? {};
  const branch = asRecord(root.branch) ?? {};
  const footer = asRecord(root.footer) ?? {};
  const lineItems = Array.isArray(inv.line_items) ? inv.line_items : [];
  const firstLine = asRecord(lineItems[0]);
  const counselorName =
    (typeof client.assigned_counselor_name === "string" && client.assigned_counselor_name) ||
    (typeof client.owner_name === "string" && client.owner_name) ||
    (typeof pay.posted_by_name === "string" && pay.posted_by_name) ||
    (typeof root.generated_by_name === "string" && root.generated_by_name) ||
    (typeof root.posted_by_name === "string" && root.posted_by_name) ||
    "System";
  const receivedByName =
    (typeof pay.verified_by_name === "string" && pay.verified_by_name) ||
    (typeof root.generated_by_name === "string" && root.generated_by_name) ||
    (typeof pay.posted_by_name === "string" && pay.posted_by_name) ||
    counselorName ||
    "System";
  if (typeof console !== "undefined") {
    console.info("[receipt] snapshot→template mapping", {
      receipt: root.receipt_number,
      counselorName,
      receivedByName,
      hasAssignedCounselor: !!client.assigned_counselor_name,
      hasOwner: !!client.owner_name,
      hasVerifiedBy: !!pay.verified_by_name,
      hasGeneratedBy: !!root.generated_by_name,
    });
  }
  const invAmount = Number(inv.amount ?? 0);
  const invPaid = Number(inv.amount_paid ?? 0);
  return {
    receiptNumber: typeof root.receipt_number === "string" ? root.receipt_number : "",
    receiptDate: typeof root.generated_at === "string" ? root.generated_at : new Date().toISOString(),
    invoiceNumber: typeof inv.invoice_number === "string" ? inv.invoice_number : "",
    invoiceDate:
      typeof inv.invoice_date === "string"
        ? inv.invoice_date
        : typeof root.generated_at === "string"
          ? root.generated_at
          : new Date().toISOString(),
    companyName:
      (typeof firm.name === "string" ? firm.name : undefined) ??
      (typeof footer.legal_name === "string" ? footer.legal_name : undefined) ??
      "Future Link Consultants",
    companyEntity: typeof root.entity_code === "string" ? root.entity_code : "",
    companyBranch:
      (typeof branch.name === "string" ? branch.name : undefined) ??
      (typeof root.branch_code === "string" ? root.branch_code : undefined) ??
      "",
    companyAddress:
      (typeof firm.address === "string" ? firm.address : undefined) ??
      (typeof footer.address === "string" ? footer.address : undefined) ??
      "",
    companyEmail:
      (typeof firm.email === "string" ? firm.email : undefined) ??
      (typeof footer.support_email === "string" ? footer.support_email : undefined) ??
      "",
    companyPhone:
      (typeof firm.phone === "string" ? firm.phone : undefined) ??
      (typeof footer.support_phone === "string" ? footer.support_phone : undefined) ??
      "",
    companyLogo: typeof firm.logo_url === "string" ? firm.logo_url : undefined,
    clientName: typeof client.name === "string" ? client.name : "",
    clientEmail: typeof client.email === "string" ? client.email : "",
    clientPhone: typeof client.phone === "string" ? client.phone : "",
    serviceType: firstLine
      ? String(firstLine.service_name ?? firstLine.description ?? "Service")
      : "Service",
    counselorName,
    receivedByName,
    invoiceTotal: invAmount,
    amountPaid: Number(pay.amount ?? 0),
    outstandingBalance: Number(inv.outstanding ?? Math.max(invAmount - invPaid, 0)),
    currency:
      (typeof pay.currency === "string" ? pay.currency : undefined) ??
      (typeof inv.currency === "string" ? inv.currency : undefined) ??
      "INR",
    paymentDate:
      (typeof pay.paid_at === "string" ? pay.paid_at : undefined) ??
      (typeof root.generated_at === "string" ? root.generated_at : undefined) ??
      new Date().toISOString(),
    paymentMethod: String(pay.method ?? "")
      .replace(/_/g, " ")
      .toUpperCase(),
    paymentReference: typeof pay.reference === "string" ? pay.reference : undefined,
    subtotal: Number(inv.subtotal ?? inv.amount ?? 0),
    taxAmount: Number(inv.tax_amount ?? 0),
    isInstalment: false,
  };
}

interface EntityInfo {
  address: string;
  email: string;
  phone: string;
  gst?: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  tan?: string;
  bn?: string;
  gstHst?: string;
  payroll?: string;
  corporateTax?: string;
  taxYearEnd?: string;
  legalName?: string;
  directors?: string;
  note?: string;
}

export function getEntityAddress(entity: string, branch: string): EntityInfo {
  // TODO: Add real GSTIN/PAN/CIN/BN/GST-HST values before going live.
  const addresses: Record<string, EntityInfo> = {
    // ── 3 INDIA COMPANIES (MCA-verified) ──
    "Future Link Consultants Private Limited": {
      legalName: "Future Link Consultants Private Limited",
      address: "Shop 215-216, Atlantis, Vadivadi,\nSarabhai Compound, Vadodara,\nGujarat 390023, India",
      gstin: "24AAECF6140K1ZP",
      gst: "24AAECF6140K1ZP",
      pan: "AAECF6140K",
      cin: "U74999GJ2021PTC123559",
      tan: "BRDF00780D",
      directors: "Santosh D Ramrakhiani & Krishaa S Ramrakhiani",
      email: "accounts@futurelinkconsultants.com",
      phone: "+91 265 XXX XXXX",
    },
    "Future Link Visa Consultants Private Limited": {
      legalName: "Future Link Visa Consultants Private Limited",
      address: "216 Atlantis, Opp Vadodara Central,\nNr. Genda Circle, Vadodara,\nGujarat 390023, India",
      gstin: "24AABCF3724G1Z1",
      gst: "24AABCF3724G1Z1",
      pan: "AABCF3724G",
      cin: "U74900GJ2009PTC057220",
      directors: "Santosh D Ramrakhiani & Krishaa S Ramrakhiani",
      email: "accounts@futurelinkconsultants.com",
      phone: "+91 265 XXX XXXX",
    },
    "Future Link Academic Excellence Private Limited": {
      legalName: "Future Link Academic Excellence Private Limited",
      address: "216 Atlantis Complex,\nOpp Vadodara Central,\nNr. Genda Circle, Vadodara,\nGujarat 390023, India",
      gstin: "",
      gst: "",
      pan: "AADCF0528Q",
      cin: "U74991GJ2017PTC096530",
      directors: "Santosh D Ramrakhiani & Krishaa S Ramrakhiani",
      email: "accounts@futurelinkconsultants.com",
      phone: "+91 265 XXX XXXX",
      note: "Formerly: Future Link Educational and Immigration Services Pvt Ltd (name changed April 2017)",
    },
    // ── 3 CANADA COMPANIES ──
    "Future Link Consultants Inc": {
      legalName: "FUTURE LINK CONSULTANTS INC.",
      address: "5 Vandorf Street, Toronto,\nOntario M1B 4Y3, Canada",
      bn: "851089714",
      gstHst: "851089714RT0001",
      gst: "851089714RT0001",
      payroll: "851089714RP0001",
      corporateTax: "851089714RC0001",
      taxYearEnd: "August 31",
      email: "overseasrelations@futurelinkconsultants.com",
      phone: "+1 416 902 4524",
      note: "Main Canada operating company",
    },
    "Future Way Consultants Inc": {
      legalName: "FUTUREWAY CONSULTANTS INC.",
      address: "5 Vandorf Street, Toronto,\nOntario M1B 4Y3, Canada",
      bn: "819356389",
      gstHst: "819356389RT0001",
      gst: "819356389RT0001",
      payroll: "819356389RP0001",
      corporateTax: "819356389RC0001",
      taxYearEnd: "December 31",
      email: "overseasrelations@futurelinkconsultants.com",
      phone: "+1 416 902 4524",
      note: "Canada registered company",
    },
    "Ontario Inc 2709223": {
      legalName: "2709223 ONTARIO INC.",
      address: "5 Vandorf Street, Toronto,\nOntario M1B 4Y3, Canada",
      bn: "778840876",
      gstHst: "778840876RT0001",
      gst: "778840876RT0001",
      payroll: "778840876RP0001",
      corporateTax: "778840876RC0001",
      taxYearEnd: "December 31",
      email: "overseasrelations@futurelinkconsultants.com",
      phone: "+1 416 902 4524",
      note: "Ontario numbered company",
    },
  };

  // Aliases — legacy "Pvt Ltd" names still in use across the system resolve
  // to the same MCA-verified records as their "Private Limited" canonical key.
  addresses["Future Link Consultants Pvt Ltd"] = addresses["Future Link Consultants Private Limited"];
  addresses["Future Link Visa Consultants Pvt Ltd"] = addresses["Future Link Visa Consultants Private Limited"];
  addresses["Future Link Academic Excellence Pvt Ltd"] = addresses["Future Link Academic Excellence Private Limited"];

  // Branch-level overrides (used when entity is not an exact match or for branch addresses on receipts).
  const branchAddresses: Record<string, EntityInfo> = {
    "Vadodara — Genda Circle": { address: "Genda Circle, Vadodara,\nGujarat 390023, India", email: "accounts@futurelinkconsultants.com", phone: "+91 265 XXX XXXX", gst: "" },
    "Vadodara — Bhayli": { address: "Bhayli, Vadodara,\nGujarat 391410, India", email: "accounts@futurelinkconsultants.com", phone: "+91 265 XXX XXXX", gst: "" },
    "Vadodara — Karelibaug": { address: "Karelibaug, Vadodara,\nGujarat 390018, India", email: "accounts@futurelinkconsultants.com", phone: "+91 265 XXX XXXX", gst: "" },
    "Vadodara — Manjalpur": { address: "Manjalpur, Vadodara,\nGujarat 390011, India", email: "accounts@futurelinkconsultants.com", phone: "+91 265 XXX XXXX", gst: "" },
    "Vadodara — Ajwa Road": { address: "Ajwa Road, Vadodara,\nGujarat 390019, India", email: "accounts@futurelinkconsultants.com", phone: "+91 265 XXX XXXX", gst: "" },
    "Anand — Gujarat": { address: "Anand, Gujarat 388001, India", email: "accounts@futurelinkconsultants.com", phone: "+91 2692 XXX XXX", gst: "" },
    "Toronto — Ontario": { address: "5 Vandorf Street, Toronto,\nOntario M1B 4Y3, Canada", email: "overseasrelations@futurelinkconsultants.com", phone: "+1 416 902 4524", gst: "" },
    "Finksburg — Maryland": { address: "Finksburg, Maryland, USA", email: "accounts@futurelinkconsultants.com", phone: "", note: "Office only — no US legal entity. Payments via Canada or India." },
  };

  return (
    addresses[entity] ??
    branchAddresses[branch] ?? {
      address: `${branch} Office — Future Link Consultants`,
      email: "accounts@futurelinkconsultants.com",
      phone: "Contact your branch",
    }
  );
}

const SERVICE_LABELS: Record<string, string> = {
  IELTS_COACHING: "IELTS Coaching",
  TOEFL_COACHING: "TOEFL Coaching",
  PTE_COACHING: "PTE Coaching",
  FRENCH_LANGUAGE: "French Language Course",
  GERMAN_LANGUAGE: "German Language Course",
  SPANISH_LANGUAGE: "Spanish Language Course",
  JAPANESE_LANGUAGE: "Japanese Language Course",
  MANDARIN_LANGUAGE: "Mandarin Language Course",
  CANADA_STUDENT_VISA: "Canada Student Visa",
  UK_STUDENT_VISA: "UK Student Visa",
  AUSTRALIA_STUDENT_VISA: "Australia Student Visa",
  USA_STUDENT_VISA: "USA Student Visa",
  SCHENGEN_VISA: "Schengen Visa",
  UAE_VISA: "UAE Visa",
  NEW_ZEALAND_STUDENT_VISA: "New Zealand Student Visa",
  GERMANY_STUDENT_VISA: "Germany Student Visa",
  IRELAND_STUDENT_VISA: "Ireland Student Visa",
  CANADA_PR: "Canada PR Application",
  AUSTRALIA_PR: "Australia PR Application",
  UK_SKILLED_WORKER: "UK Skilled Worker Visa",
  USA_WORK_PERMIT: "USA Work Permit",
  CANADA_WORK_PERMIT: "Canada Work Permit",
  TOURIST_VISA_CANADA: "Tourist Visa — Canada",
  TOURIST_VISA_USA: "Tourist Visa — USA",
  TOURIST_VISA_SCHENGEN: "Tourist Visa — Schengen",
  UNIVERSITY_ADMISSIONS: "University Admissions",
  STUDY_ABROAD_PACKAGE: "Study Abroad Package",
  DOCUMENT_ATTESTATION: "Document Attestation",
  TRANSLATION_SERVICES: "Translation Services",
  MOCK_TEST_PACKAGE: "Mock Test Package",
  SOP_LOR_WRITING: "SOP & LOR Writing",
  ACCOMMODATION_ASSISTANCE: "Accommodation Assistance",
  SCHOLARSHIP_GUIDANCE: "Scholarship Guidance",
  OTHER: "Other Services",
};

function getServiceLabel(serviceType: string): string {
  return SERVICE_LABELS[serviceType] ?? serviceType;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  CAD: "CA$",
  USD: "US$",
  INR: "₹",
  AED: "AED",
  GBP: "£",
  AUD: "A$",
  EUR: "€",
};

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}

export function fmtReceiptAmount(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return `${currencySymbol(currency)} ${formatted}`;
}

export function maskPassport(p?: string): string | undefined {
  if (!p) return undefined;
  const tail = p.slice(-4);
  return `••••••${tail}`;
}

export function buildReceiptData(
  invoice: CustomerInvoice,
  amountPaid: number,
  paymentDate: string,
  paymentMethod: string,
  paymentReference?: string,
  instalmentNumber?: number
): ReceiptData {
  const entityInfo = getEntityAddress(invoice.entity, invoice.branch);
  return {
    receiptNumber: generateReceiptNumber(invoice.invoiceNumber, instalmentNumber ?? 1),
    receiptDate: paymentDate,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    companyName: "Future Link Consultants",
    companyEntity: invoice.entity,
    companyBranch: invoice.branch,
    companyAddress: entityInfo.address,
    companyEmail: entityInfo.email,
    companyPhone: entityInfo.phone,
    companyGST: entityInfo.gst,
    clientName: invoice.client,
    clientEmail: invoice.clientEmail,
    clientPhone: invoice.clientPhone,
    passportNumber: invoice.clientPassportNumber,
    serviceType: getServiceLabel(invoice.serviceType),
    destinationCountry: invoice.destinationCountry,
    universityName: invoice.universityName,
    programName: invoice.programName,
    intakeMonth: invoice.intakeMonth,
    counselorName: invoice.counselor,
    coCounselorName: invoice.coCounselor,
    receivedByName: invoice.counselor,
    invoiceTotal: invoice.totalAmount,
    amountPaid,
    outstandingBalance: Math.max(0, invoice.totalAmount - invoice.receivedAmount),
    currency: invoice.currency,
    paymentDate,
    paymentMethod,
    paymentReference,
    subtotal: invoice.subtotal,
    taxCode: invoice.taxCode,
    taxAmount: invoice.taxAmount,
    isInstalment: invoice.installmentPlan ?? false,
    instalmentNumber,
    totalInstalments: invoice.totalInstallments,
  };
}