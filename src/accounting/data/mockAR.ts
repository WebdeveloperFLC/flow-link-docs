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

export const MOCK_INVOICES: CustomerInvoice[] = [
  mk('i1', 'INV-2024-001', 'Ananya Sharma', 'ananya.sharma@email.com', 'CANADA_STUDENT_VISA', 'CAD', 1800,
    'Canada student visa — University of Toronto Jan 2025 intake', 'PAID', '2024-09-25', '2024-10-15', 'Priya Sharma',
    { destinationCountry: 'Canada', universityName: 'University of Toronto', intakeMonth: 'January 2025', paidDate: '2024-10-10', paymentMethod: 'BANK_TRANSFER', paymentReference: 'TXN-9981', linkedBankAccountId: 'ba-1', viewedAt: '2024-09-26' }),
  mk('i2', 'INV-2024-002', 'Rohan Mehta', 'rohan.mehta@email.com', 'IELTS_COACHING', 'INR', 28000,
    'IELTS coaching — 3 month intensive package + 2 mock tests', 'OVERDUE', '2024-09-25', '2024-10-14', 'Raj Kumar',
    { branch: 'India — Mumbai', daysOverdue: 18, linkedJournalId: 'je4', viewedAt: '2024-09-28' }),
  mk('i3', 'INV-2024-003', 'Kavya Reddy', 'kavya.reddy@email.com', 'AUSTRALIA_STUDENT_VISA', 'AUD', 2400,
    'Australia student visa + university admissions — Monash University Feb 2025', 'SENT', '2024-10-25', '2024-11-15', 'Sarah Johnson',
    { destinationCountry: 'Australia', universityName: 'Monash University', intakeMonth: 'February 2025', branch: 'India — Mumbai', branchCountry: 'IN', entity: 'Future Link India Pvt Ltd' }),
  mk('i4', 'INV-2024-004', 'Harpreet Singh', 'harpreet.singh@email.com', 'CANADA_PR', 'CAD', 3500,
    'Canada PR application — Express Entry complete package', 'PARTIALLY_PAID', '2024-09-15', '2024-11-30', 'Jennifer Walsh',
    { destinationCountry: 'Canada', receivedAmount: 1750, installmentPlan: true, totalInstallments: 2, installmentsPaid: 1, linkedBankAccountId: 'ba-1', paymentMethod: 'WIRE', paymentReference: 'WIRE-3344' }),
  mk('i5', 'INV-2024-005', 'Fatima Al Rashid', 'fatima.alrashid@email.com', 'UAE_VISA', 'AED', 3200,
    'UAE residence visa + Emirates ID processing', 'PAID', '2024-10-05', '2024-10-25', 'Amit Patel',
    { branch: 'UAE — Dubai', branchCountry: 'AE', paidDate: '2024-10-20', paymentMethod: 'BANK_TRANSFER', paymentReference: 'AED-7721' }),
  mk('i6', 'INV-2024-006', 'Siddharth Joshi', 'sid.joshi@email.com', 'UK_STUDENT_VISA', 'GBP', 1600,
    'UK student visa — University of Edinburgh Sept 2025 intake', 'OVERDUE', '2024-09-20', '2024-10-07', 'Neha Gupta',
    { destinationCountry: 'United Kingdom', universityName: 'University of Edinburgh', intakeMonth: 'September 2025', daysOverdue: 25, linkedJournalId: 'je5' }),
  mk('i7', 'INV-2024-007', 'Meera Nair', 'meera.nair@email.com', 'FRENCH_LANGUAGE', 'INR', 35000,
    'French language — DELF B2 preparation 4 month course', 'SENT', '2024-10-28', '2024-11-20', 'Neha Gupta',
    { destinationCountry: 'France', branch: 'India — Mumbai' }),
  mk('i8', 'INV-2024-008', 'Aditya Kumar', 'aditya.kumar@email.com', 'GERMANY_STUDENT_VISA', 'EUR', 1800,
    'Germany student visa + blocked account assistance + APS', 'PAID', '2024-09-15', '2024-10-05', 'Arjun Mehta',
    { destinationCountry: 'Germany', paidDate: '2024-09-30', paymentMethod: 'WIRE', paymentReference: 'EUR-5544', linkedBankAccountId: 'ba-3' }),
  mk('i9', 'INV-2024-009', 'Priya Patel', 'priya.patel@email.com', 'STUDY_ABROAD_PACKAGE', 'EUR', 2200,
    'Complete study abroad package — Ireland undergraduate admissions + visa', 'PARTIALLY_PAID', '2024-09-10', '2024-12-01', 'Arjun Mehta',
    { destinationCountry: 'Ireland', receivedAmount: 1100, installmentPlan: true, totalInstallments: 2, installmentsPaid: 1, paymentMethod: 'BANK_TRANSFER' }),
  mk('i10', 'INV-2024-010', 'Vikram Chauhan', 'vikram.c@email.com', 'TOEFL_COACHING', 'INR', 22000,
    'TOEFL iBT coaching — 2 month course + 3 full mock tests', 'OVERDUE', '2024-09-30', '2024-10-22', 'Raj Kumar',
    { branch: 'India — Delhi', daysOverdue: 10 }),
  mk('i11', 'INV-2024-011', 'Zara Ahmed', 'zara.ahmed@email.com', 'SCHENGEN_VISA', 'INR', 18500,
    'Schengen multi-country tourist visa — Italy Spain France', 'PAID', '2024-09-20', '2024-10-10', 'Priya Sharma',
    { destinationCountry: 'Other', paidDate: '2024-10-05', paymentMethod: 'UPI', paymentReference: 'UPI-9988', linkedJournalId: 'je1' }),
  mk('i12', 'INV-2024-012', 'Aryan Verma', 'aryan.verma@email.com', 'USA_STUDENT_VISA', 'USD', 1200,
    'USA F1 student visa — interview prep + documentation + filing', 'SENT', '2024-10-22', '2024-11-12', 'Sarah Johnson',
    { destinationCountry: 'United States', universityName: 'Northeastern University', intakeMonth: 'September 2025', linkedBankAccountId: 'ba-3', viewedAt: '2024-10-23' }),
  mk('i13', 'INV-2024-013', 'Ishaan Kapoor', 'ishaan.k@email.com', 'PTE_COACHING', 'INR', 19500,
    'PTE Academic coaching — 6 week intensive + score guarantee package', 'OVERDUE', '2024-09-15', '2024-09-27', 'Raj Kumar',
    { branch: 'India — Mumbai', daysOverdue: 35 }),
  mk('i14', 'INV-2024-014', 'Ritika Singhania', 'ritika.s@email.com', 'CANADA_WORK_PERMIT', 'CAD', 2800,
    'Canada LMIA-exempt work permit application — ICT category', 'SENT', '2024-10-25', '2024-11-20', 'Jennifer Walsh',
    { destinationCountry: 'Canada' }),
  mk('i15', 'INV-2024-015', 'Mohammed Al Farsi', 'mo.alfarsi@email.com', 'ACCOMMODATION_ASSISTANCE', 'CAD', 850,
    'Student accommodation search and booking assistance — Toronto', 'PAID', '2024-10-10', '2024-10-25', 'Sarah Johnson',
    { branch: 'Canada — Toronto', paidDate: '2024-10-18', paymentMethod: 'CARD', paymentReference: 'STR-1002' }),
  mk('i16', 'INV-2024-016', 'Sneha Kulkarni', 'sneha.k@email.com', 'SOP_LOR_WRITING', 'INR', 15000,
    'SOP writing + 3 LORs + university shortlisting — Canada universities', 'DRAFT', '2024-10-30', '2024-11-15', 'Raj Kumar',
    { destinationCountry: 'Canada' }),
  mk('i17', 'INV-2024-017', 'Tanvi Desai', 'tanvi.d@email.com', 'SCHOLARSHIP_GUIDANCE', 'INR', 12000,
    'Scholarship research + application assistance — UK universities', 'DRAFT', '2024-10-30', '2024-11-20', 'Neha Gupta',
    { destinationCountry: 'United Kingdom' }),
  mk('i18', 'INV-2024-018', 'Rajesh Nambiar', 'r.nambiar@email.com', 'GERMAN_LANGUAGE', 'INR', 42000,
    'German A1 to B1 complete course — 6 months', 'VOID', '2024-08-20', '2024-09-10', 'Arjun Mehta',
    { notes: 'Client relocated — refund processed', destinationCountry: 'Germany' }),
];
