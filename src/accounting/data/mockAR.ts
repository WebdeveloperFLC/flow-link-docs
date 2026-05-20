export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';

export type ServiceType =
  | 'IELTS_COACHING' | 'TOEFL_COACHING' | 'PTE_COACHING'
  | 'FRENCH_LANGUAGE' | 'GERMAN_LANGUAGE' | 'SPANISH_LANGUAGE' | 'JAPANESE_LANGUAGE' | 'MANDARIN_LANGUAGE'
  | 'CANADA_STUDENT_VISA' | 'UK_STUDENT_VISA' | 'AUSTRALIA_STUDENT_VISA' | 'USA_STUDENT_VISA'
  | 'SCHENGEN_VISA' | 'UAE_VISA' | 'NEW_ZEALAND_STUDENT_VISA' | 'GERMANY_STUDENT_VISA' | 'IRELAND_STUDENT_VISA'
  | 'CANADA_PR' | 'AUSTRALIA_PR' | 'UK_SKILLED_WORKER' | 'USA_WORK_PERMIT' | 'CANADA_WORK_PERMIT'
  | 'TOURIST_VISA_CANADA' | 'TOURIST_VISA_USA' | 'TOURIST_VISA_SCHENGEN'
  | 'UNIVERSITY_ADMISSIONS' | 'STUDY_ABROAD_PACKAGE' | 'DOCUMENT_ATTESTATION' | 'TRANSLATION_SERVICES'
  | 'MOCK_TEST_PACKAGE' | 'SOP_LOR_WRITING' | 'ACCOMMODATION_ASSISTANCE' | 'SCHOLARSHIP_GUIDANCE' | 'OTHER';

export type DestinationCountry =
  | 'Canada' | 'United Kingdom' | 'Australia' | 'United States' | 'Germany' | 'Ireland'
  | 'New Zealand' | 'France' | 'Netherlands' | 'Sweden' | 'Denmark' | 'Finland' | 'Norway'
  | 'UAE' | 'Singapore' | 'Japan' | 'South Korea' | 'Italy' | 'Spain' | 'Portugal' | 'Malta'
  | 'Poland' | 'Hungary' | 'Czech Republic' | 'Other';

export type RevenueCategory =
  | 'COACHING_TRAINING'
  | 'LANGUAGE_COURSES'
  | 'TEST_PREP'
  | 'VISA_IMMIGRATION'
  | 'UNIVERSITY_ADMISSIONS'
  | 'INSTITUTION_COMMISSION'
  | 'STUDY_ABROAD_PACKAGE'
  | 'DOCUMENTATION_SERVICES'
  | 'TRANSLATION_ATTESTATION'
  | 'CONSULTING_FEES'
  | 'OTHER';

export const REVENUE_CATEGORY_LABELS: Record<RevenueCategory, string> = {
  COACHING_TRAINING: 'Coaching & training',
  LANGUAGE_COURSES: 'Language courses',
  TEST_PREP: 'Test prep (IELTS / TOEFL / PTE)',
  VISA_IMMIGRATION: 'Visa & immigration',
  UNIVERSITY_ADMISSIONS: 'University admissions',
  INSTITUTION_COMMISSION: 'Institution commission',
  STUDY_ABROAD_PACKAGE: 'Study-abroad package',
  DOCUMENTATION_SERVICES: 'Documentation services',
  TRANSLATION_ATTESTATION: 'Translation & attestation',
  CONSULTING_FEES: 'Consulting fees',
  OTHER: 'Other revenue',
};

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  client: string;
  clientEmail: string;
  clientPhone?: string;
  clientPassportNumber?: string;
  counselor: string;
  coCounselor?: string;
  entity: string;
  branch: string;
  branchCountry: 'CA' | 'US' | 'IN' | 'AE' | 'OTHER';
  serviceType: ServiceType;
  revenueCategory?: RevenueCategory;
  destinationCountry?: DestinationCountry;
  programName?: string;
  universityName?: string;
  intakeMonth?: string;
  description: string;
  invoiceDate: string;
  dueDate: string;
  currency: 'CAD' | 'USD' | 'INR' | 'AED' | 'GBP' | 'AUD' | 'EUR';
  subtotal: number;
  taxCode: string;
  taxAmount: number;
  totalAmount: number;
  receivedAmount: number;
  outstandingBalance: number;
  status: InvoiceStatus;
  linkedDocumentId?: string;
  linkedJournalId?: string;
  linkedBankAccountId?: string;
  linkedCOACode: string;
  linkedRevenueCOACode?: string;
  paidDate?: string;
  paymentMethod?: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'UPI' | 'CARD' | 'WIRE' | 'OTHER';
  paymentReference?: string;
  notes?: string;
  daysOverdue?: number;
  viewedAt?: string;
  installmentPlan?: boolean;
  totalInstallments?: number;
  installmentsPaid?: number;
  tags?: string[];
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  IELTS_COACHING: 'IELTS coaching', TOEFL_COACHING: 'TOEFL coaching', PTE_COACHING: 'PTE coaching',
  FRENCH_LANGUAGE: 'French language', GERMAN_LANGUAGE: 'German language', SPANISH_LANGUAGE: 'Spanish language',
  JAPANESE_LANGUAGE: 'Japanese language', MANDARIN_LANGUAGE: 'Mandarin language',
  CANADA_STUDENT_VISA: 'Canada student visa', UK_STUDENT_VISA: 'UK student visa',
  AUSTRALIA_STUDENT_VISA: 'Australia student visa', USA_STUDENT_VISA: 'USA student visa',
  SCHENGEN_VISA: 'Schengen visa', UAE_VISA: 'UAE visa',
  NEW_ZEALAND_STUDENT_VISA: 'New Zealand student visa', GERMANY_STUDENT_VISA: 'Germany student visa',
  IRELAND_STUDENT_VISA: 'Ireland student visa',
  CANADA_PR: 'Canada PR application', AUSTRALIA_PR: 'Australia PR application',
  UK_SKILLED_WORKER: 'UK skilled worker visa', USA_WORK_PERMIT: 'USA work permit',
  CANADA_WORK_PERMIT: 'Canada work permit',
  TOURIST_VISA_CANADA: 'Tourist visa — Canada', TOURIST_VISA_USA: 'Tourist visa — USA',
  TOURIST_VISA_SCHENGEN: 'Tourist visa — Schengen',
  UNIVERSITY_ADMISSIONS: 'University admissions', STUDY_ABROAD_PACKAGE: 'Study abroad package',
  DOCUMENT_ATTESTATION: 'Document attestation', TRANSLATION_SERVICES: 'Translation services',
  MOCK_TEST_PACKAGE: 'Mock test package', SOP_LOR_WRITING: 'SOP & LOR writing',
  ACCOMMODATION_ASSISTANCE: 'Accommodation assistance', SCHOLARSHIP_GUIDANCE: 'Scholarship guidance',
  OTHER: 'Other services',
};

export const COUNSELORS = ['Priya Sharma', 'Amit Patel', 'Sarah Johnson', 'Raj Kumar', 'Jennifer Walsh', 'Neha Gupta', 'Arjun Mehta'];

const mk = (
  id: string, invoiceNumber: string, client: string, clientEmail: string,
  service: ServiceType, currency: CustomerInvoice['currency'], subtotal: number,
  description: string, status: InvoiceStatus, invoiceDate: string, dueDate: string,
  counselor: string, extras: Partial<CustomerInvoice> = {}
): CustomerInvoice => {
  const taxRate = currency === 'INR' ? 0.18 : currency === 'CAD' ? 0.13 : 0.05;
  const taxAmount = +(subtotal * taxRate).toFixed(2);
  const total = +(subtotal + taxAmount).toFixed(2);
  const received = extras.receivedAmount ?? (status === 'PAID' ? total : 0);
  const outstanding = +(total - received).toFixed(2);
  return {
    id, invoiceNumber, client, clientEmail, counselor,
    entity: extras.entity ?? (currency === 'INR' ? 'Future Link India Pvt Ltd' : currency === 'CAD' ? 'Future Link Canada HQ' : currency === 'AED' ? 'Future Link UAE' : 'Future Link USA Corp'),
    branch: extras.branch ?? (currency === 'INR' ? 'India — Mumbai' : currency === 'CAD' ? 'Canada — Toronto' : currency === 'AED' ? 'UAE — Dubai' : 'USA — New York'),
    branchCountry: extras.branchCountry ?? (currency === 'INR' ? 'IN' : currency === 'CAD' ? 'CA' : currency === 'AED' ? 'AE' : 'US'),
    serviceType: service, description, invoiceDate, dueDate, currency, subtotal,
    taxCode: extras.taxCode ?? (currency === 'INR' ? 'IGST-18%' : currency === 'CAD' ? 'HST-13%' : 'VAT-5%'),
    taxAmount, totalAmount: total, receivedAmount: received, outstandingBalance: outstanding,
    status, linkedCOACode: '1200',
    ...extras,
  };
};

export const MOCK_INVOICES: CustomerInvoice[] = [];
