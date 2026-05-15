export type BillStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'PAID' | 'OVERDUE' | 'VOID';

export type ExpenseCategory =
  | 'RENT_UTILITIES' | 'SALARIES_PAYROLL' | 'TECHNOLOGY_SOFTWARE' | 'TRAVEL_TRANSPORT'
  | 'MARKETING_ADVERTISING' | 'PROFESSIONAL_FEES' | 'BANK_CHARGES' | 'GOVERNMENT_FEES'
  | 'OFFICE_SUPPLIES' | 'TELECOMS' | 'COACHING_MATERIALS' | 'EXAM_FEES'
  | 'VISA_FILING_COSTS' | 'UNIVERSITY_LIAISON_FEES' | 'INSURANCE' | 'MAINTENANCE' | 'OTHER';

export interface VendorBill {
  id: string;
  billNumber: string;
  vendor: string;
  vendorEmail?: string;
  vendorPhone?: string;
  vendorCategory: ExpenseCategory;
  entity: string;
  branch: string;
  branchCountry: 'CA' | 'US' | 'IN' | 'AE' | 'OTHER';
  department?: string;
  description: string;
  billDate: string;
  dueDate: string;
  currency: 'CAD' | 'USD' | 'INR' | 'AED' | 'GBP' | 'AUD' | 'EUR';
  subtotal: number;
  taxCode: string;
  taxAmount: number;
  totalAmount: number;
  status: BillStatus;
  linkedDocumentId?: string;
  linkedJournalId?: string;
  linkedBankAccountId?: string;
  linkedCOACode: string;
  paymentDate?: string;
  paymentReference?: string;
  paymentMethod?: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'CREDIT_CARD' | 'UPI' | 'WIRE' | 'OTHER';
  notes?: string;
  daysOverdue?: number;
  createdBy: string;
  approvedBy?: string;
  tags?: string[];
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  RENT_UTILITIES: 'Rent & utilities',
  SALARIES_PAYROLL: 'Salaries & payroll',
  TECHNOLOGY_SOFTWARE: 'Technology & software',
  TRAVEL_TRANSPORT: 'Travel & transport',
  MARKETING_ADVERTISING: 'Marketing & advertising',
  PROFESSIONAL_FEES: 'Professional fees',
  BANK_CHARGES: 'Bank charges',
  GOVERNMENT_FEES: 'Government & filing fees',
  OFFICE_SUPPLIES: 'Office supplies',
  TELECOMS: 'Telecoms',
  COACHING_MATERIALS: 'Coaching materials',
  EXAM_FEES: 'Exam fees & slots',
  VISA_FILING_COSTS: 'Visa filing costs',
  UNIVERSITY_LIAISON_FEES: 'University liaison fees',
  INSURANCE: 'Insurance',
  MAINTENANCE: 'Maintenance & repairs',
  OTHER: 'Other',
};

const mk = (
  id: string, billNumber: string, vendor: string, cat: ExpenseCategory,
  currency: VendorBill['currency'], subtotal: number, description: string,
  status: BillStatus, billDate: string, dueDate: string,
  extras: Partial<VendorBill> = {}
): VendorBill => {
  const taxRate = currency === 'INR' ? 0.18 : currency === 'CAD' ? 0.13 : 0.05;
  const taxAmount = +(subtotal * taxRate).toFixed(2);
  return {
    id, billNumber, vendor, vendorCategory: cat,
    entity: extras.entity ?? (currency === 'INR' ? 'Future Link India Pvt Ltd' : currency === 'CAD' ? 'Future Link Canada HQ' : 'Future Link USA Corp'),
    branch: extras.branch ?? (currency === 'INR' ? 'Mumbai Office' : currency === 'CAD' ? 'Toronto Office' : 'New York Office'),
    branchCountry: extras.branchCountry ?? (currency === 'INR' ? 'IN' : currency === 'CAD' ? 'CA' : 'US'),
    department: extras.department ?? 'Operations',
    description, billDate, dueDate, currency, subtotal,
    taxCode: extras.taxCode ?? (currency === 'INR' ? 'IGST-18%' : currency === 'CAD' ? 'HST-13%' : 'VAT-5%'),
    taxAmount, totalAmount: +(subtotal + taxAmount).toFixed(2),
    status, linkedCOACode: '2000',
    createdBy: extras.createdBy ?? 'Priya Sharma',
    ...extras,
  };
};

export const MOCK_BILLS: VendorBill[] = [
  mk('b1', 'BILL-2024-001', 'WeWork Toronto', 'RENT_UTILITIES', 'CAD', 8500,
    'November co-working space — Toronto office', 'APPROVED', '2024-10-25', '2024-11-05',
    { vendorEmail: 'billing@wework.com', linkedBankAccountId: 'ba-1', approvedBy: 'Sarah Johnson', tags: ['recurring'] }),
  mk('b2', 'BILL-2024-002', 'Microsoft Azure', 'TECHNOLOGY_SOFTWARE', 'CAD', 1240,
    'Cloud hosting — CRM and document storage Oct', 'PAID', '2024-10-01', '2024-10-30',
    { vendorEmail: 'azure-billing@microsoft.com', paymentDate: '2024-10-28', paymentReference: 'AZ-OCT-9821', paymentMethod: 'CREDIT_CARD', linkedJournalId: 'je2', approvedBy: 'Sarah Johnson', tags: ['recurring'] }),
  mk('b3', 'BILL-2024-003', 'Bell Canada', 'TELECOMS', 'CAD', 890,
    'Business internet + phone — Toronto Oct', 'PAID', '2024-10-01', '2024-10-15',
    { paymentDate: '2024-10-15', paymentReference: 'BELL-OCT-2024', paymentMethod: 'BANK_TRANSFER', approvedBy: 'Sarah Johnson' }),
  mk('b4', 'BILL-2024-004', 'Air Canada', 'TRAVEL_TRANSPORT', 'CAD', 3420,
    'Staff travel — Toronto to Vancouver immigration conference Oct 18', 'OVERDUE', '2024-09-25', '2024-10-10',
    { daysOverdue: 22, approvedBy: 'Sarah Johnson', tags: ['urgent'] }),
  mk('b5', 'BILL-2024-005', 'Adobe Systems', 'TECHNOLOGY_SOFTWARE', 'USD', 189,
    'Adobe Creative Cloud — marketing team annual', 'APPROVED', '2024-10-30', '2024-11-20',
    { entity: 'Future Link USA Corp', branch: 'New York Office', branchCountry: 'US', department: 'Marketing', linkedBankAccountId: 'ba-3', approvedBy: 'Jennifer Walsh' }),
  mk('b6', 'BILL-2024-006', 'British Council India', 'EXAM_FEES', 'INR', 45000,
    'IELTS exam slots batch booking — Mumbai centre November 2024', 'OVERDUE', '2024-10-05', '2024-10-20',
    { daysOverdue: 12, department: 'Academics', approvedBy: 'Raj Kumar', tags: ['urgent'] }),
  mk('b7', 'BILL-2024-007', 'WeWork Mumbai', 'RENT_UTILITIES', 'INR', 120000,
    'Mumbai Bandra office — November rent', 'PENDING_REVIEW', '2024-10-28', '2024-11-10',
    { branch: 'Mumbai Office', tags: ['recurring'] }),
  mk('b8', 'BILL-2024-008', 'Delhi Office Landlord', 'RENT_UTILITIES', 'INR', 85000,
    'Connaught Place office rent — November 2024', 'PENDING_REVIEW', '2024-10-28', '2024-11-10',
    { branch: 'Delhi Office', tags: ['recurring'] }),
  mk('b9', 'BILL-2024-009', 'Slack Technologies', 'TECHNOLOGY_SOFTWARE', 'USD', 312,
    'Team communication — 26 seats October', 'PAID', '2024-09-25', '2024-10-05',
    { entity: 'Future Link USA Corp', branch: 'New York Office', branchCountry: 'US', paymentDate: '2024-10-01', paymentReference: 'SLK-OCT-7733', paymentMethod: 'CREDIT_CARD', linkedJournalId: 'je3', approvedBy: 'Jennifer Walsh' }),
  mk('b10', 'BILL-2024-010', 'Rogers Communications', 'TELECOMS', 'CAD', 420,
    'Mobile plan — 4 business lines October', 'OVERDUE', '2024-10-10', '2024-10-25',
    { daysOverdue: 7, approvedBy: 'Sarah Johnson' }),
  mk('b11', 'BILL-2024-011', 'IDP Education India', 'UNIVERSITY_LIAISON_FEES', 'INR', 75000,
    'University partner liaison fee Q3 2024', 'PENDING_REVIEW', '2024-10-30', '2024-11-15',
    { department: 'Visa & Immigration' }),
  mk('b12', 'BILL-2024-012', 'Amazon Web Services', 'TECHNOLOGY_SOFTWARE', 'USD', 856,
    'AWS infrastructure — document OCR processing Oct', 'APPROVED', '2024-10-30', '2024-11-15',
    { entity: 'Future Link USA Corp', branch: 'New York Office', branchCountry: 'US', linkedBankAccountId: 'ba-3', approvedBy: 'Jennifer Walsh', tags: ['recurring'] }),
  mk('b13', 'BILL-2024-013', 'HDFC Bank', 'BANK_CHARGES', 'INR', 2400,
    'Processing charges + maintenance Oct 2024', 'DRAFT', '2024-10-31', '2024-11-15',
    { department: 'Finance & Accounts' }),
  mk('b14', 'BILL-2024-014', 'Canada Immigration Consultants Assoc', 'PROFESSIONAL_FEES', 'CAD', 2800,
    'Annual RCIC membership renewal 2025', 'DRAFT', '2024-10-30', '2024-11-30',
    { department: 'Visa & Immigration' }),
  mk('b15', 'BILL-2024-015', 'Zoom Video', 'TECHNOLOGY_SOFTWARE', 'USD', 149,
    'Video conferencing — 10 hosts annual licence', 'VOID', '2024-09-15', '2024-10-01',
    { entity: 'Future Link USA Corp', branch: 'New York Office', branchCountry: 'US', notes: 'Switched to Microsoft Teams' }),
];
