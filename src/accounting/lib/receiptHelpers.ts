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

interface EntityInfo {
  address: string;
  email: string;
  phone: string;
  gst?: string;
  pan?: string;
  cin?: string;
  bn?: string;
  note?: string;
}

export function getEntityAddress(entity: string, branch: string): EntityInfo {
  // TODO: Add real GSTIN/PAN/CIN/BN/GST-HST values before going live.
  const addresses: Record<string, EntityInfo> = {
    // ── 3 INDIA COMPANIES ──
    "Future Link Consultants Pvt Ltd": {
      address: "Genda Circle, Vadodara,\nGujarat 390023, India",
      email: "accounts@futurelinkconsultants.com",
      phone: "+91 265 XXX XXXX",
      gst: "",
      pan: "",
      cin: "",
      note: "All services — transitioning all entities here",
    },
    "Future Link Visa Consultants Pvt Ltd": {
      address: "Genda Circle, Vadodara,\nGujarat 390023, India",
      email: "accounts@futurelinkconsultants.com",
      phone: "+91 265 XXX XXXX",
      gst: "",
      pan: "",
      cin: "",
      note: "Legacy entity — visa and immigration services",
    },
    "Future Link Academic Excellence Pvt Ltd": {
      address: "Genda Circle, Vadodara,\nGujarat 390023, India",
      email: "accounts@futurelinkconsultants.com",
      phone: "+91 265 XXX XXXX",
      gst: "",
      pan: "",
      cin: "",
      note: "Legacy entity — coaching services",
    },
    // ── 3 CANADA COMPANIES ──
    "Future Link Consultants Inc": {
      address: "5 Vandorf Street, Toronto,\nOntario M1B 4Y3, Canada",
      email: "overseasrelations@futurelinkconsultants.com",
      phone: "+1 416 902 4524",
      gst: "",
      bn: "",
      note: "Main Canada operating company",
    },
    "Future Way Consultants Inc": {
      address: "5 Vandorf Street, Toronto,\nOntario M1B 4Y3, Canada",
      email: "overseasrelations@futurelinkconsultants.com",
      phone: "+1 416 902 4524",
      gst: "",
      bn: "",
      note: "Canada registered company",
    },
    "Ontario Inc 2709223": {
      address: "5 Vandorf Street, Toronto,\nOntario M1B 4Y3, Canada",
      email: "overseasrelations@futurelinkconsultants.com",
      phone: "+1 416 902 4524",
      bn: "",
      note: "Ontario numbered company",
    },
  };

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