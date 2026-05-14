export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type SourceType = 'MANUAL' | 'OCR_UPLOAD' | 'AP' | 'AR';
export type JournalStatus = 'DRAFT' | 'PENDING_REVIEW' | 'POSTED' | 'VOIDED';
export type Currency = 'CAD' | 'USD' | 'INR';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subType: string;
}

export interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debit: number;
  credit: number;
  description: string;
  taxCode: string;
}

export interface Journal {
  id: string;
  entryNumber: string;
  entryDate: string;
  entity: string;
  narration: string;
  sourceType: SourceType;
  reference: string;
  currency: Currency;
  status: JournalStatus;
  createdBy: string;
  postedAt?: string;
  voidedAt?: string;
  voidReason?: string;
  lines: JournalLine[];
}

export const MOCK_ACCOUNTS: Account[] = [
  { id: 'a1',  code: '1000', name: 'Cash',                      type: 'ASSET',     subType: 'CASH' },
  { id: 'a2',  code: '1100', name: 'RBC Business Chequing',     type: 'ASSET',     subType: 'BANK' },
  { id: 'a3',  code: '1200', name: 'Accounts receivable',       type: 'ASSET',     subType: 'TRADE_RECEIVABLE' },
  { id: 'a4',  code: '1300', name: 'Prepaid expenses',          type: 'ASSET',     subType: 'PREPAID' },
  { id: 'a5',  code: '1500', name: 'Office equipment',          type: 'ASSET',     subType: 'FIXED_ASSET' },
  { id: 'a6',  code: '2000', name: 'Accounts payable',          type: 'LIABILITY', subType: 'TRADE_PAYABLE' },
  { id: 'a7',  code: '2100', name: 'GST/HST payable',           type: 'LIABILITY', subType: 'TAX' },
  { id: 'a8',  code: '2200', name: 'Payroll liabilities',       type: 'LIABILITY', subType: 'PAYROLL' },
  { id: 'a9',  code: '2300', name: 'Credit card payable',       type: 'LIABILITY', subType: 'CREDIT_CARD' },
  { id: 'a10', code: '3000', name: 'Share capital',             type: 'EQUITY',    subType: 'CAPITAL' },
  { id: 'a11', code: '3100', name: 'Retained earnings',         type: 'EQUITY',    subType: 'RETAINED' },
  { id: 'a12', code: '4000', name: 'Consulting revenue',        type: 'REVENUE',   subType: 'OPERATING' },
  { id: 'a13', code: '4100', name: 'Software licence fees',     type: 'REVENUE',   subType: 'OPERATING' },
  { id: 'a14', code: '4200', name: 'Training revenue',          type: 'REVENUE',   subType: 'OPERATING' },
  { id: 'a15', code: '5000', name: 'Salaries & wages',          type: 'EXPENSE',   subType: 'PAYROLL' },
  { id: 'a16', code: '5100', name: 'Rent & utilities',          type: 'EXPENSE',   subType: 'OVERHEAD' },
  { id: 'a17', code: '5200', name: 'Travel & entertainment',    type: 'EXPENSE',   subType: 'T&E' },
  { id: 'a18', code: '5300', name: 'Office supplies',           type: 'EXPENSE',   subType: 'OVERHEAD' },
  { id: 'a19', code: '5400', name: 'Professional fees',         type: 'EXPENSE',   subType: 'PROFESSIONAL' },
  { id: 'a20', code: '5500', name: 'Technology & software',     type: 'EXPENSE',   subType: 'TECHNOLOGY' },
];

const acc = (id: string) => MOCK_ACCOUNTS.find(a => a.id === id)!;
const ln = (
  id: string,
  accountId: string,
  debit: number,
  credit: number,
  description: string,
  taxCode = ''
): JournalLine => {
  const a = acc(accountId);
  return {
    id,
    accountId,
    accountCode: a.code,
    accountName: a.name,
    accountType: a.type,
    debit,
    credit,
    description,
    taxCode,
  };
};

export const MOCK_JOURNALS: Journal[] = [
  {
    id: 'je1', entryNumber: 'JE-2024-0001', entryDate: '2024-10-01',
    entity: 'Canada HQ', narration: 'October office rent — Toronto',
    sourceType: 'MANUAL', reference: 'RENT-OCT-2024', currency: 'CAD',
    status: 'POSTED', createdBy: 'Priya Sharma', postedAt: '2024-10-01T14:23:00Z',
    lines: [
      ln('l1-1', 'a16', 8500, 0, 'October rent', 'HST-13%'),
      ln('l1-2', 'a7',  1105, 0, 'HST on rent'),
      ln('l1-3', 'a2',  0, 9605, 'Payment from RBC'),
    ],
  },
  {
    id: 'je2', entryNumber: 'JE-2024-0002', entryDate: '2024-10-02',
    entity: 'Canada HQ', narration: 'Bi-weekly payroll — Canada team',
    sourceType: 'MANUAL', reference: 'PAY-2024-20', currency: 'CAD',
    status: 'POSTED', createdBy: 'Aman Verma', postedAt: '2024-10-02T17:05:00Z',
    lines: [
      ln('l2-1', 'a15', 142000, 0, 'Gross salaries — period 20'),
      ln('l2-2', 'a8',  0, 28400, 'CPP/EI/tax withholdings'),
      ln('l2-3', 'a2',  0, 113600, 'Net payroll disbursement'),
    ],
  },
  {
    id: 'je3', entryNumber: 'JE-2024-0003', entryDate: '2024-10-03',
    entity: 'Canada HQ', narration: 'Consulting invoice — Maple Realty Group',
    sourceType: 'AR', reference: 'INV-2024-0042', currency: 'CAD',
    status: 'POSTED', createdBy: 'Priya Sharma', postedAt: '2024-10-03T10:15:00Z',
    lines: [
      ln('l3-1', 'a3',  16950, 0, 'Receivable — Maple Realty'),
      ln('l3-2', 'a12', 0, 15000, 'Q4 advisory engagement', 'HST-13%'),
      ln('l3-3', 'a7',  0, 1950, 'HST output'),
    ],
  },
  {
    id: 'je4', entryNumber: 'JE-2024-0004', entryDate: '2024-10-05',
    entity: 'Canada HQ', narration: 'Vendor bill — Acme Office Supplies',
    sourceType: 'AP', reference: 'BILL-ACME-9921', currency: 'CAD',
    status: 'POSTED', createdBy: 'Neha Kapoor', postedAt: '2024-10-05T12:30:00Z',
    lines: [
      ln('l4-1', 'a18', 1240, 0, 'Office supplies restock', 'HST-13%'),
      ln('l4-2', 'a7',  161.20, 0, 'HST input credit'),
      ln('l4-3', 'a6',  0, 1401.20, 'Acme A/P'),
    ],
  },
  {
    id: 'je5', entryNumber: 'JE-2024-0005', entryDate: '2024-10-07',
    entity: 'USA Corp', narration: 'AWS monthly invoice',
    sourceType: 'AP', reference: 'AWS-OCT-2024', currency: 'USD',
    status: 'POSTED', createdBy: 'Rohit Mehra', postedAt: '2024-10-07T09:00:00Z',
    lines: [
      ln('l5-1', 'a20', 4820, 0, 'AWS infrastructure — October'),
      ln('l5-2', 'a9',  0, 4820, 'Amex corporate card'),
    ],
  },
  {
    id: 'je6', entryNumber: 'JE-2024-0006', entryDate: '2024-10-08',
    entity: 'Canada HQ', narration: 'Conference travel — Vancouver',
    sourceType: 'MANUAL', reference: 'EXP-RPT-118', currency: 'CAD',
    status: 'POSTED', createdBy: 'Aman Verma', postedAt: '2024-10-08T16:45:00Z',
    lines: [
      ln('l6-1', 'a17', 3200, 0, 'Flights, hotels, meals'),
      ln('l6-2', 'a9',  0, 3200, 'Corporate Visa'),
    ],
  },
  {
    id: 'je7', entryNumber: 'JE-2024-0007', entryDate: '2024-10-10',
    entity: 'India Mumbai', narration: 'Software licence — JetBrains team pack',
    sourceType: 'AP', reference: 'JB-RENEW-24', currency: 'INR',
    status: 'POSTED', createdBy: 'Karan Iyer', postedAt: '2024-10-10T11:20:00Z',
    lines: [
      ln('l7-1', 'a20', 185000, 0, 'Annual JetBrains renewal'),
      ln('l7-2', 'a6',  0, 185000, 'Vendor payable'),
    ],
  },
  {
    id: 'je8', entryNumber: 'JE-2024-0008', entryDate: '2024-10-12',
    entity: 'Canada HQ', narration: 'HST remittance — Q3 2024',
    sourceType: 'MANUAL', reference: 'CRA-HST-Q3', currency: 'CAD',
    status: 'POSTED', createdBy: 'Priya Sharma', postedAt: '2024-10-12T15:00:00Z',
    lines: [
      ln('l8-1', 'a7',  18420, 0, 'HST liability cleared'),
      ln('l8-2', 'a2',  0, 18420, 'Wire to CRA'),
    ],
  },
  {
    id: 'je9', entryNumber: 'JE-2024-0009', entryDate: '2024-10-14',
    entity: 'Canada HQ', narration: 'Training revenue — corporate cohort',
    sourceType: 'AR', reference: 'INV-2024-0051', currency: 'CAD',
    status: 'POSTED', createdBy: 'Neha Kapoor', postedAt: '2024-10-14T13:10:00Z',
    lines: [
      ln('l9-1', 'a3',  9040, 0, 'Receivable — TD Bank'),
      ln('l9-2', 'a14', 0, 8000, 'Workshop fees', 'HST-13%'),
      ln('l9-3', 'a7',  0, 1040, 'HST output'),
    ],
  },
  {
    id: 'je10', entryNumber: 'JE-2024-0010', entryDate: '2024-10-15',
    entity: 'Canada HQ', narration: 'Legal fees — incorporation update',
    sourceType: 'AP', reference: 'BILL-LAW-771', currency: 'CAD',
    status: 'POSTED', createdBy: 'Aman Verma', postedAt: '2024-10-15T18:00:00Z',
    lines: [
      ln('l10-1', 'a19', 2500, 0, 'Legal counsel'),
      ln('l10-2', 'a7',  325, 0, 'HST input'),
      ln('l10-3', 'a6',  0, 2825, 'A/P legal'),
    ],
  },
  {
    id: 'je11', entryNumber: 'JE-2024-0011', entryDate: '2024-10-16',
    entity: 'Canada HQ', narration: 'Draft — November rent accrual',
    sourceType: 'MANUAL', reference: 'RENT-NOV-2024', currency: 'CAD',
    status: 'DRAFT', createdBy: 'Priya Sharma',
    lines: [
      ln('l11-1', 'a16', 8500, 0, 'November rent estimate'),
      ln('l11-2', 'a6',  0, 8500, 'Accrual'),
    ],
  },
  {
    id: 'je12', entryNumber: 'JE-2024-0012', entryDate: '2024-10-17',
    entity: 'India Delhi', narration: 'Draft — utility bill split',
    sourceType: 'MANUAL', reference: 'UTIL-DEL-OCT', currency: 'INR',
    status: 'DRAFT', createdBy: 'Karan Iyer',
    lines: [
      ln('l12-1', 'a16', 42000, 0, 'Power & water — Delhi office'),
      ln('l12-2', 'a6',  0, 42000, 'Vendor accrual'),
    ],
  },
  {
    id: 'je13', entryNumber: 'JE-2024-0013', entryDate: '2024-10-18',
    entity: 'Canada HQ', narration: 'Draft — prepaid insurance allocation',
    sourceType: 'MANUAL', reference: 'INS-ALLOC-10', currency: 'CAD',
    status: 'DRAFT', createdBy: 'Aman Verma',
    lines: [
      ln('l13-1', 'a19', 1850, 0, 'Insurance expense — October'),
      ln('l13-2', 'a4',  0, 1850, 'Prepaid release'),
    ],
  },
  {
    id: 'je14', entryNumber: 'JE-2024-0014', entryDate: '2024-10-19',
    entity: 'USA Corp', narration: 'Draft — vendor reclass',
    sourceType: 'MANUAL', reference: 'RECLASS-118', currency: 'USD',
    status: 'DRAFT', createdBy: 'Rohit Mehra',
    lines: [
      ln('l14-1', 'a18', 620, 0, 'Reclass to office supplies'),
      ln('l14-2', 'a17', 0, 620, 'Out of T&E'),
    ],
  },
  {
    id: 'je15', entryNumber: 'JE-2024-0015', entryDate: '2024-10-20',
    entity: 'Canada HQ', narration: 'Pending review — consultant timesheet',
    sourceType: 'AP', reference: 'TS-2024-44', currency: 'CAD',
    status: 'PENDING_REVIEW', createdBy: 'Neha Kapoor',
    lines: [
      ln('l15-1', 'a19', 6400, 0, 'Independent contractor fees'),
      ln('l15-2', 'a6',  0, 6400, 'Contractor A/P'),
    ],
  },
  {
    id: 'je16', entryNumber: 'JE-2024-0016', entryDate: '2024-10-21',
    entity: 'India Mumbai', narration: 'Pending review — equipment purchase',
    sourceType: 'AP', reference: 'PO-IN-2210', currency: 'INR',
    status: 'PENDING_REVIEW', createdBy: 'Karan Iyer',
    lines: [
      ln('l16-1', 'a5',  340000, 0, 'Workstations × 4'),
      ln('l16-2', 'a6',  0, 340000, 'Vendor payable'),
    ],
  },
  {
    id: 'je17', entryNumber: 'JE-2024-0017', entryDate: '2024-10-22',
    entity: 'Canada HQ', narration: 'Pending review — client refund',
    sourceType: 'AR', reference: 'CR-2024-09', currency: 'CAD',
    status: 'PENDING_REVIEW', createdBy: 'Priya Sharma',
    lines: [
      ln('l17-1', 'a12', 2000, 0, 'Revenue reversal'),
      ln('l17-2', 'a7',  260, 0, 'HST reversal'),
      ln('l17-3', 'a3',  0, 2260, 'A/R adjustment'),
    ],
  },
  {
    id: 'je18', entryNumber: 'JE-2024-0018', entryDate: '2024-09-25',
    entity: 'Canada HQ', narration: 'Voided — duplicate vendor bill',
    sourceType: 'AP', reference: 'BILL-DUP-441', currency: 'CAD',
    status: 'VOIDED', createdBy: 'Aman Verma',
    postedAt: '2024-09-25T10:00:00Z',
    voidedAt: '2024-09-26T09:30:00Z',
    voidReason: 'Duplicate of BILL-ACME-9921',
    lines: [
      ln('l18-1', 'a18', 1240, 0, 'Office supplies'),
      ln('l18-2', 'a6',  0, 1240, 'A/P'),
    ],
  },
  {
    id: 'je19', entryNumber: 'JE-2024-0019', entryDate: '2024-09-28',
    entity: 'USA Corp', narration: 'Voided — incorrect FX rate applied',
    sourceType: 'MANUAL', reference: 'FX-ADJ-08', currency: 'USD',
    status: 'VOIDED', createdBy: 'Rohit Mehra',
    postedAt: '2024-09-28T14:00:00Z',
    voidedAt: '2024-09-29T11:15:00Z',
    voidReason: 'FX rate keyed incorrectly; reposted as JE-2024-0020',
    lines: [
      ln('l19-1', 'a20', 1500, 0, 'SaaS subscription'),
      ln('l19-2', 'a9',  0, 1500, 'Corporate card'),
    ],
  },
  {
    id: 'je20', entryNumber: 'JE-2024-0020', entryDate: '2024-10-23',
    entity: 'Canada HQ', narration: 'OCR — scanned utility bill (Hydro One)',
    sourceType: 'OCR_UPLOAD', reference: 'HYDRO-OCT-2024', currency: 'CAD',
    status: 'PENDING_REVIEW', createdBy: 'OCR Service',
    lines: [
      ln('l20-1', 'a16', 1820, 0, 'Hydro — October', 'HST-13%'),
      ln('l20-2', 'a7',  236.60, 0, 'HST input'),
      ln('l20-3', 'a6',  0, 2056.60, 'Hydro One A/P'),
    ],
  },
];

// Legacy export kept for any existing imports
export const mockJournals = MOCK_JOURNALS;
