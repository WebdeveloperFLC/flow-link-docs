import type { Client, ClientInvoice, ClientReceipt, ClientTxn, ClientAging } from '../types/clients';

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1', name: 'Maple Realty Group', legalName: 'Maple Realty Group Ltd.',
    segment: 'ENTERPRISE', country: 'CA', taxId: '12345-6789-RC0001',
    paymentTerms: 'Net 30', currency: 'CAD', status: 'ACTIVE',
    outstandingReceivable: 32400, ytdRevenue: 184000, lastTxnDate: '2024-10-03',
    email: 'finance@maplerealty.ca', phone: '+1 416 555 0220',
    address: '100 King St W, Toronto, ON', accountManager: 'Priya Sharma',
  },
  {
    id: 'c2', name: 'TD Bank — Talent Ops', legalName: 'The Toronto-Dominion Bank',
    segment: 'ENTERPRISE', country: 'CA', taxId: '13456-9000-RC0021',
    paymentTerms: 'Net 45', currency: 'CAD', status: 'ACTIVE',
    outstandingReceivable: 18040, ytdRevenue: 268000, lastTxnDate: '2024-10-14',
    email: 'ap-talent@td.com', phone: '+1 416 308 6000',
    address: '66 Wellington St W, Toronto, ON', accountManager: 'Aman Verma',
  },
  {
    id: 'c3', name: 'Northwind Logistics', legalName: 'Northwind Logistics LLC',
    segment: 'SMB', country: 'US', taxId: '88-1234567',
    paymentTerms: 'Net 30', currency: 'USD', status: 'ACTIVE',
    outstandingReceivable: 9600, ytdRevenue: 72400, lastTxnDate: '2024-10-09',
    email: 'ap@northwind.io', phone: '+1 312 555 0410',
    address: '500 W Madison St, Chicago, IL', accountManager: 'Rohit Mehra',
  },
  {
    id: 'c4', name: 'BlueOcean Startups', legalName: 'BlueOcean Holdings Inc.',
    segment: 'STARTUP', country: 'US', taxId: '46-9988776',
    paymentTerms: 'Net 14', currency: 'USD', status: 'ACTIVE',
    outstandingReceivable: 4800, ytdRevenue: 36200, lastTxnDate: '2024-10-11',
    email: 'ops@blueocean.vc', phone: '+1 415 555 0550',
    address: '1 Market St, San Francisco, CA', accountManager: 'Priya Sharma',
  },
  {
    id: 'c5', name: 'Government of Maharashtra', legalName: 'Govt. of Maharashtra — IT Dept',
    segment: 'GOVERNMENT', country: 'IN', taxId: '27GOVMH1234A1Z3',
    paymentTerms: 'Net 60', currency: 'INR', status: 'ON_HOLD',
    outstandingReceivable: 1240000, ytdRevenue: 4800000, lastTxnDate: '2024-08-22',
    email: 'accounts@maharashtra.gov.in', phone: '+91 22 2202 2222',
    address: 'Mantralaya, Mumbai 400032', accountManager: 'Karan Iyer',
  },
  {
    id: 'c6', name: 'Brightpath Academy', legalName: 'Brightpath Education Pvt Ltd',
    segment: 'SMB', country: 'IN', taxId: '29AABCB1234P1Z9',
    paymentTerms: 'Net 30', currency: 'INR', status: 'ACTIVE',
    outstandingReceivable: 0, ytdRevenue: 920000, lastTxnDate: '2024-10-02',
    email: 'finance@brightpath.in', phone: '+91 80 4040 9000',
    address: 'Indiranagar, Bengaluru 560038', accountManager: 'Karan Iyer',
  },
  {
    id: 'c7', name: 'Helix Biotech', legalName: 'Helix Biotech Corp.',
    segment: 'ENTERPRISE', country: 'US', taxId: '94-7766554',
    paymentTerms: 'Net 45', currency: 'USD', status: 'ACTIVE',
    outstandingReceivable: 22400, ytdRevenue: 168000, lastTxnDate: '2024-10-08',
    email: 'ap@helixbio.com', phone: '+1 617 555 0900',
    address: '600 Atlantic Ave, Boston, MA', accountManager: 'Aman Verma',
  },
  {
    id: 'c8', name: 'Anita Ramachandran', legalName: 'Anita Ramachandran (Individual)',
    segment: 'INDIVIDUAL', country: 'CA', taxId: '—',
    paymentTerms: 'Due on receipt', currency: 'CAD', status: 'ACTIVE',
    outstandingReceivable: 1200, ytdRevenue: 4800, lastTxnDate: '2024-10-16',
    email: 'anita.r@gmail.com', phone: '+1 437 555 0991',
    address: 'Mississauga, ON', accountManager: 'Neha Kapoor',
  },
];

export const MOCK_CLIENT_INVOICES: ClientInvoice[] = [
  { id: 'ci1', clientId: 'c1', number: 'INV-2024-0042', issueDate: '2024-10-03', dueDate: '2024-11-02', amount: 16950, paidAmount: 0, currency: 'CAD', status: 'SENT' },
  { id: 'ci2', clientId: 'c1', number: 'INV-2024-0036', issueDate: '2024-09-12', dueDate: '2024-10-12', amount: 15450, paidAmount: 0, currency: 'CAD', status: 'OVERDUE' },
  { id: 'ci3', clientId: 'c2', number: 'INV-2024-0051', issueDate: '2024-10-14', dueDate: '2024-11-28', amount: 9040, paidAmount: 0, currency: 'CAD', status: 'SENT' },
  { id: 'ci4', clientId: 'c2', number: 'INV-2024-0048', issueDate: '2024-09-25', dueDate: '2024-11-09', amount: 9000, paidAmount: 0, currency: 'CAD', status: 'SENT' },
  { id: 'ci5', clientId: 'c3', number: 'INV-2024-0055', issueDate: '2024-10-09', dueDate: '2024-11-08', amount: 9600, paidAmount: 0, currency: 'USD', status: 'SENT' },
  { id: 'ci6', clientId: 'c4', number: 'INV-2024-0058', issueDate: '2024-10-11', dueDate: '2024-10-25', amount: 4800, paidAmount: 0, currency: 'USD', status: 'SENT' },
  { id: 'ci7', clientId: 'c5', number: 'INV-2024-0029', issueDate: '2024-08-22', dueDate: '2024-10-21', amount: 1240000, paidAmount: 0, currency: 'INR', status: 'OVERDUE' },
  { id: 'ci8', clientId: 'c7', number: 'INV-2024-0050', issueDate: '2024-10-08', dueDate: '2024-11-22', amount: 22400, paidAmount: 0, currency: 'USD', status: 'SENT' },
  { id: 'ci9', clientId: 'c8', number: 'INV-2024-0061', issueDate: '2024-10-16', dueDate: '2024-10-16', amount: 1200, paidAmount: 0, currency: 'CAD', status: 'SENT' },
];

export const MOCK_CLIENT_RECEIPTS: ClientReceipt[] = [
  { id: 'cr1', clientId: 'c1', date: '2024-09-30', reference: 'RCP-2024-080', method: 'WIRE', amount: 12000, currency: 'CAD', appliedTo: ['INV-2024-0030'], bankAccount: 'RBC ••••4521' },
  { id: 'cr2', clientId: 'c2', date: '2024-09-28', reference: 'RCP-2024-082', method: 'EFT', amount: 24000, currency: 'CAD', appliedTo: ['INV-2024-0044'], bankAccount: 'RBC ••••4521' },
  { id: 'cr3', clientId: 'c3', date: '2024-09-22', reference: 'RCP-2024-079', method: 'WIRE', amount: 8200, currency: 'USD', appliedTo: ['INV-2024-0041'], bankAccount: 'Chase ••••5544' },
  { id: 'cr4', clientId: 'c6', date: '2024-10-02', reference: 'RCP-2024-090', method: 'UPI', amount: 920000, currency: 'INR', appliedTo: ['INV-2024-0033'], bankAccount: 'HDFC ••••0300' },
  { id: 'cr5', clientId: 'c7', date: '2024-09-18', reference: 'RCP-2024-076', method: 'WIRE', amount: 18000, currency: 'USD', appliedTo: ['INV-2024-0040'], bankAccount: 'Chase ••••5544' },
];

const ctxn = (id: string, c: string, d: string, r: string, t: ClientTxn['type'], desc: string, dr: number, cr: number, bal: number, cur: ClientTxn['currency'] = 'CAD'): ClientTxn =>
  ({ id, clientId: c, date: d, reference: r, type: t, description: desc, debit: dr, credit: cr, balance: bal, currency: cur });

export const MOCK_CLIENT_TXNS: ClientTxn[] = [
  ctxn('ct1', 'c1', '2024-09-12', 'INV-2024-0036', 'INVOICE', 'September advisory', 15450, 0, 15450),
  ctxn('ct2', 'c1', '2024-09-30', 'RCP-2024-080', 'RECEIPT', 'Wire from Maple', 0, 12000, 3450),
  ctxn('ct3', 'c1', '2024-10-03', 'INV-2024-0042', 'INVOICE', 'Q4 advisory engagement', 16950, 0, 20400),
  ctxn('ct4', 'c2', '2024-09-25', 'INV-2024-0048', 'INVOICE', 'Talent ops cohort', 9000, 0, 9000),
  ctxn('ct5', 'c2', '2024-09-28', 'RCP-2024-082', 'RECEIPT', 'EFT from TD', 0, 24000, -15000),
  ctxn('ct6', 'c2', '2024-10-14', 'INV-2024-0051', 'INVOICE', 'Training revenue — Oct', 9040, 0, 18040),
  ctxn('ct7', 'c3', '2024-09-22', 'RCP-2024-079', 'RECEIPT', 'Wire from Northwind', 0, 8200, -8200, 'USD'),
  ctxn('ct8', 'c3', '2024-10-09', 'INV-2024-0055', 'INVOICE', 'Logistics consulting', 9600, 0, 9600, 'USD'),
];

export function getClientAging(clientId: string): ClientAging {
  const invs = MOCK_CLIENT_INVOICES.filter(i => i.clientId === clientId && i.status !== 'PAID');
  const today = new Date('2024-10-20').getTime();
  const aging: ClientAging = { current: 0, d30: 0, d60: 0, d90: 0 };
  for (const i of invs) {
    const due = new Date(i.dueDate).getTime();
    const days = Math.floor((today - due) / 86400000);
    const open = i.amount - i.paidAmount;
    if (days <= 0) aging.current += open;
    else if (days <= 30) aging.d30 += open;
    else if (days <= 60) aging.d60 += open;
    else aging.d90 += open;
  }
  return aging;
}

export const CLIENT_SEGMENT_LABEL: Record<string, string> = {
  ENTERPRISE: 'Enterprise',
  SMB: 'SMB',
  STARTUP: 'Startup',
  GOVERNMENT: 'Government',
  INDIVIDUAL: 'Individual',
};