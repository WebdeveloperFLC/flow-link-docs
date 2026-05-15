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
}

export function getEntityAddress(entity: string, branch: string): EntityInfo {
  // India branch-level overrides — GST registration is state-wise in India,
  // each branch has its own GSTIN and is legally required on the receipt.
  if (entity === "Future Link India Pvt Ltd") {
    const b = branch.toLowerCase();
    if (b.includes("delhi")) {
      return {
        address: "M-11, Connaught Place, New Delhi 110001, India",
        email: "accounts@futurelinkconsultants.in",
        phone: "+91-11-4567-8900",
        gst: "07AAFCF1234A1Z3",
      };
    }
    if (b.includes("mumbai")) {
      return {
        address: "Unit 502, Bandra Kurla Complex, Mumbai 400051, Maharashtra, India",
        email: "accounts@futurelinkconsultants.in",
        phone: "+91-22-4567-8900",
        gst: "27AAFCF1234A1Z1",
      };
    }
    if (b.includes("bangalore")) {
      return {
        address: "4th Floor, UB City, Vittal Mallya Road, Bangalore 560001, Karnataka, India",
        email: "accounts@futurelinkconsultants.in",
        phone: "+91-80-4567-8900",
        gst: "29AAFCF1234A1Z9",
      };
    }
  }

  const addresses: Record<string, EntityInfo> = {
    "Future Link Canada HQ": {
      address: "123 Bay Street, Suite 400, Toronto, ON M5H 2R3, Canada",
      email: "accounts@futurelinkconsultants.ca",
      phone: "+1-416-555-0100",
    },
    "Future Link India Pvt Ltd": {
      address: "Unit 502, Bandra Kurla Complex, Mumbai 400051, India",
      email: "accounts@futurelinkconsultants.in",
      phone: "+91-22-4567-8900",
      gst: "27AAFCF1234A1Z1",
    },
    "Future Link USA Corp": {
      address: "350 Fifth Avenue, Suite 2100, New York, NY 10118, USA",
      email: "accounts@futurelinkconsultants.com",
      phone: "+1-212-555-0200",
    },
    "Future Link UAE": {
      address: "Office 14B, Business Bay, Dubai, UAE",
      email: "accounts@futurelinkconsultants.ae",
      phone: "+971-4-555-0300",
    },
  };

  return (
    addresses[entity] ?? {
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