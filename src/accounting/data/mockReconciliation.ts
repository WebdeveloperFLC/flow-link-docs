export interface BankStatementLine {
  id: string;
  date: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance: number;
  currency: string;
  rawText: string;
}

export interface ReconciliationMatch {
  statementLineId: string;
  journalLineId?: string;
  journalEntryNumber?: string;
  confidence: number;
  matchType: 'EXACT' | 'FUZZY' | 'MANUAL' | 'UNMATCHED' | 'NEW_ENTRY';
  matchReasons: string[];
  status: 'AUTO_MATCHED' | 'NEEDS_REVIEW' | 'CONFIRMED' | 'UNMATCHED' | 'EXCEPTION';
  reviewNote?: string;
}

export interface ReconciliationSession {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  entity: string;
  currency: string;
  statementDate: string;
  statementFrom: string;
  statementTo: string;
  openingBalance: number;
  closingBalance: number;
  totalLines: number;
  matchedLines: number;
  unreconciledLines: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  createdAt: string;
  completedAt?: string;
  createdBy: string;
}

const mk = (
  id: string,
  date: string,
  description: string,
  debit: number,
  credit: number,
  balance: number,
  reference?: string
): BankStatementLine => ({
  id,
  date,
  description,
  debit,
  credit,
  balance,
  currency: 'CAD',
  reference,
  rawText: `${date},${description},${reference ?? ''},${debit},${credit},${balance}`,
});

export const MOCK_STATEMENT_LINES: BankStatementLine[] = [
  mk('s1',  '2024-10-01', 'Opening balance brought forward',                  0,    245000, 245000),
  mk('s2',  '2024-10-01', 'WEWORK TORONTO OCT RENT',                         8500, 0,      236500, 'WW-OCT-2024'),
  mk('s3',  '2024-10-03', 'CLIENT PAYMENT INV2024012 SHARMA FAMILY TRUST',   0,    18500,  255000),
  mk('s4',  '2024-10-05', 'MICROSOFT AZURE OCT SERVICES',                    1240, 0,      253760, 'MSFT-INV-OCT24'),
  mk('s5',  '2024-10-07', 'CLIENT PAYMENT MEHTA ENT LTD',                    0,    12800,  266560),
  mk('s6',  '2024-10-10', 'AIR CANADA BUSINESS TRAVEL',                      3420, 0,      263140, 'AC-BOOKING-78234'),
  mk('s7',  '2024-10-12', 'BELL CANADA SERVICES OCT',                        890,  0,      262250),
  mk('s8',  '2024-10-14', 'TORONTO IMMIGRATION SERVICES CONSULTING FEE',     0,    22000,  284250),
  mk('s9',  '2024-10-15', 'PAYROLL CRA REMITTANCE SEP24',                    17800,0,      266450, 'CRA-PAY-SEP24'),
  mk('s10', '2024-10-16', 'ROGERS COMM MOBILE PLAN',                         420,  0,      266030),
  mk('s11', '2024-10-18', 'PACIFIC CONSULTING GROUP INV2024018 PAYMENT',     0,    8500,   274530),
  mk('s12', '2024-10-20', 'RCIC MEMBERSHIP FEE 2025',                        2800, 0,      271730),
  mk('s13', '2024-10-22', 'SINGH AND ASSOCIATES PYMT',                       0,    15600,  287330),
  mk('s14', '2024-10-24', 'SLACK TECHNOLOGIES USD 229',                      312,  0,      287018),
  mk('s15', '2024-10-25', 'CRA GST HST REMITTANCE Q3',                       48500,0,      238518, 'CRA-GST-Q3-2024'),
  mk('s16', '2024-10-26', 'GLOBAL EDUCATION PARTNERS',                       0,    9800,   248318),
  mk('s17', '2024-10-28', 'PAYROLL OCT 2024 DIRECT DEP',                     124000,0,     124318, 'PR-OCT-2024'),
  mk('s18', '2024-10-29', 'ADOBE SYSTEMS SUBSCRIPTION',                      189,  0,      124129),
  mk('s19', '2024-10-30', 'NORTH STAR IMMIGRATION PMT',                      0,    6200,   130329),
  mk('s20', '2024-10-31', 'BANK SERVICE CHARGES OCT',                        2400, 0,      127929),
];

export const MOCK_PAST_SESSIONS: ReconciliationSession[] = [
  {
    id: 'rs-1', bankAccountId: 'ba-1', bankAccountName: 'RBC Business Chequing',
    entity: 'Canada HQ', currency: 'CAD',
    statementDate: '2024-09-30', statementFrom: '2024-09-01', statementTo: '2024-09-30',
    openingBalance: 218400, closingBalance: 245000,
    totalLines: 20, matchedLines: 18, unreconciledLines: 2,
    status: 'COMPLETED', createdAt: '2024-10-02T09:00:00Z', completedAt: '2024-10-02T11:30:00Z',
    createdBy: 'Priya Sharma',
  },
  {
    id: 'rs-2', bankAccountId: 'ba-4', bankAccountName: 'HDFC Current Account',
    entity: 'India Mumbai', currency: 'INR',
    statementDate: '2024-10-31', statementFrom: '2024-10-01', statementTo: '2024-10-31',
    openingBalance: 4250000, closingBalance: 5180000,
    totalLines: 22, matchedLines: 22, unreconciledLines: 0,
    status: 'COMPLETED', createdAt: '2024-11-02T08:15:00Z', completedAt: '2024-11-02T09:45:00Z',
    createdBy: 'Karan Iyer',
  },
  {
    id: 'rs-3', bankAccountId: 'ba-3', bankAccountName: 'Chase Business Checking',
    entity: 'USA Corp', currency: 'USD',
    statementDate: '2024-10-31', statementFrom: '2024-10-01', statementTo: '2024-10-31',
    openingBalance: 96400, closingBalance: 88200,
    totalLines: 13, matchedLines: 8, unreconciledLines: 5,
    status: 'IN_PROGRESS', createdAt: '2024-11-04T14:20:00Z',
    createdBy: 'Rohit Mehra',
  },
];
