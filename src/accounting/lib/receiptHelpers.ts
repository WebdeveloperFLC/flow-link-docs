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

/**
 * Build a ReceiptData object from a stored `client_invoice_receipts.receipt_snapshot_jsonb`.
 * Allows reprinting/downloading historical receipts without re-querying live data.
 * Returns null when the snapshot is missing or malformed.
 */
export function snapshotToReceiptData(snapshot: any): ReceiptData | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const inv = snapshot.invoice ?? {};
  const pay = snapshot.payment ?? {};
  const client = snapshot.client ?? {};
  const firm = snapshot.firm ?? {};
  const branch = snapshot.branch ?? {};
  const footer = snapshot.footer ?? {};
  // Counselor: assigned counselor → owner → posted-by → generated-by → "System".
  const counselorName =
    client.assigned_counselor_name ||
    client.owner_name ||
    pay.posted_by_name ||
    snapshot.generated_by_name ||
    snapshot.posted_by_name ||
    "System";
  // Received by: payment verifier → snapshot generator → posted-by → counselor → "System".
  const receivedByName =
    pay.verified_by_name ||
    snapshot.generated_by_name ||
    pay.posted_by_name ||
    counselorName ||
    "System";
  if (typeof console !== "undefined") {
    console.info("[receipt] snapshot→template mapping", {
      receipt: snapshot.receipt_number,
      counselorName,
      receivedByName,
      hasAssignedCounselor: !!client.assigned_counselor_name,
      hasOwner: !!client.owner_name,
      hasVerifiedBy: !!pay.verified_by_name,
      hasGeneratedBy: !!snapshot.generated_by_name,
    });
  }
  return {
    receiptNumber: snapshot.receipt_number ?? "",
    receiptDate: snapshot.generated_at ?? new Date().toISOString(),
    invoiceNumber: inv.invoice_number ?? "",
    invoiceDate: inv.invoice_date ?? snapshot.generated_at ?? new Date().toISOString(),
    companyName: firm.name ?? footer.legal_name ?? "Future Link Consultants",
    companyEntity: snapshot.entity_code ?? "",
    companyBranch: branch.name ?? snapshot.branch_code ?? "",
    companyAddress: firm.address ?? footer.address ?? "",
    companyEmail: firm.email ?? footer.support_email ?? "",
    companyPhone: firm.phone ?? footer.support_phone ?? "",
    companyLogo: firm.logo_url ?? undefined,
    clientName: client.name ?? "",
    clientEmail: client.email ?? "",
    clientPhone: client.phone ?? "",
    serviceType: Array.isArray(inv.line_items) && inv.line_items[0]
      ? (inv.line_items[0].service_name ?? inv.line_items[0].description ?? "Service")
      : "Service",
    counselorName,
    receivedByName,
    invoiceTotal: Number(inv.amount ?? 0),
    amountPaid: Number(pay.amount ?? 0),
    outstandingBalance: Number(inv.outstanding ?? Math.max((inv.amount ?? 0) - (inv.amount_paid ?? 0), 0)),
    currency: pay.currency ?? inv.currency ?? "INR",
    paymentDate: pay.paid_at ?? snapshot.generated_at ?? new Date().toISOString(),
    paymentMethod: (pay.method ?? "").toString().replace(/_/g, " ").toUpperCase(),
    paymentReference: pay.reference ?? undefined,
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