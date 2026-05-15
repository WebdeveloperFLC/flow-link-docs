import type {
  Vendor, VendorTxn, VendorDocument, VendorPayment, VendorAging,
} from '../types/vendors';

export const MOCK_VENDORS: Vendor[] = [
  {
    id: 'v1', name: 'Acme Office Supplies', legalName: 'Acme Office Supplies Inc.',
    category: 'OFFICE_SUPPLIES', country: 'CA', taxId: '789456123BC0001',
    paymentTerms: 'Net 30', currency: 'CAD', status: 'ACTIVE',
    outstandingBalance: 18400, ytdSpend: 142800, lastTxnDate: '2024-10-05',
    email: 'ar@acmesupplies.ca', phone: '+1 416 555 0140',
    address: '210 King St W, Toronto, ON M5H 1J8', bankAccount: '••••4521',
    contactName: 'Sarah Liu', contactEmail: 'sarah.liu@acmesupplies.ca', contactPhone: '+1 416 555 0141',
  },
  {
    id: 'v2', name: 'TechPro Solutions', legalName: 'TechPro Solutions LLC',
    category: 'PROFESSIONAL_SERVICES', country: 'US', taxId: '12-3456789',
    paymentTerms: 'Net 45', currency: 'USD', status: 'ON_HOLD',
    outstandingBalance: 24500, ytdSpend: 286000, lastTxnDate: '2024-10-12',
    email: 'billing@techpro.io', phone: '+1 415 555 0190',
    address: '500 Howard St, San Francisco, CA 94105',
    contactName: 'Marcus Chen', contactEmail: 'marcus@techpro.io',
  },
  {
    id: 'v3', name: 'AWS', legalName: 'Amazon Web Services Inc.',
    category: 'SOFTWARE', country: 'US', taxId: '91-1646860',
    paymentTerms: 'Net 30', currency: 'USD', status: 'ACTIVE',
    outstandingBalance: 4820, ytdSpend: 52840, lastTxnDate: '2024-10-07',
    email: 'aws-receivables@amazon.com', phone: '+1 206 266 1000',
    address: '410 Terry Ave N, Seattle, WA 98109',
  },
  {
    id: 'v4', name: 'JetBrains', legalName: 'JetBrains s.r.o.',
    category: 'SOFTWARE', country: 'CZ', taxId: 'CZ26502275',
    paymentTerms: 'Net 15', currency: 'INR', status: 'ACTIVE',
    outstandingBalance: 0, ytdSpend: 185000, lastTxnDate: '2024-10-10',
    email: 'sales@jetbrains.com', phone: '+420 296 825 829',
    address: 'Na hřebenech II 1718/10, Prague',
  },
  {
    id: 'v5', name: 'Toronto Hydro', legalName: 'Toronto Hydro-Electric System Ltd.',
    category: 'UTILITIES', country: 'CA', taxId: '83456712BC0001',
    paymentTerms: 'Net 21', currency: 'CAD', status: 'ACTIVE',
    outstandingBalance: 1240, ytdSpend: 18920, lastTxnDate: '2024-10-15',
    email: 'billing@torontohydro.com', phone: '+1 416 542 8000',
    address: '14 Carlton St, Toronto, ON M5B 1K5',
  },
  {
    id: 'v6', name: 'WeWork', legalName: 'WeWork Companies LLC',
    category: 'RENT', country: 'CA', taxId: '12-7777111',
    paymentTerms: 'Net 1', currency: 'CAD', status: 'ACTIVE',
    outstandingBalance: 8500, ytdSpend: 102000, lastTxnDate: '2024-10-01',
    email: 'invoices@wework.com', phone: '+1 855 936 9675',
    address: '240 Richmond St W, Toronto, ON',
  },
  {
    id: 'v7', name: 'Air Canada', legalName: 'Air Canada Corporate Travel',
    category: 'TRAVEL', country: 'CA', taxId: '10072899RT',
    paymentTerms: 'Net 14', currency: 'CAD', status: 'ACTIVE',
    outstandingBalance: 3200, ytdSpend: 48700, lastTxnDate: '2024-10-08',
    email: 'corp@aircanada.ca', phone: '+1 888 247 2262',
    address: '7373 Côte-Vertu Blvd W, Saint-Laurent, QC',
  },
  {
    id: 'v8', name: 'Deloitte', legalName: 'Deloitte LLP',
    category: 'PROFESSIONAL_SERVICES', country: 'CA', taxId: '12-9999000',
    paymentTerms: 'Net 30', currency: 'CAD', status: 'ACTIVE',
    outstandingBalance: 15800, ytdSpend: 96000, lastTxnDate: '2024-09-29',
    email: 'ar@deloitte.ca', phone: '+1 416 601 6150',
    address: '8 Adelaide St W, Toronto, ON',
  },
  {
    id: 'v9', name: 'Bell Canada', legalName: 'Bell Canada Enterprises',
    category: 'TELECOM', country: 'CA', taxId: '12-2222111',
    paymentTerms: 'Net 21', currency: 'CAD', status: 'ACTIVE',
    outstandingBalance: 642, ytdSpend: 8420, lastTxnDate: '2024-10-14',
    email: 'billing@bell.ca', phone: '+1 800 668 6878',
    address: '1 Carrefour Alexander-Graham-Bell, Verdun, QC',
  },
  {
    id: 'v10', name: 'FastPay Services', legalName: 'FastPay Services Pvt Ltd',
    category: 'CONTRACTOR', country: 'IN', taxId: '27AAACF1234X1Z5',
    paymentTerms: 'Net 7', currency: 'INR', status: 'BLOCKED',
    outstandingBalance: 0, ytdSpend: 24000, lastTxnDate: '2024-08-12',
    email: 'support@fastpay.in', phone: '+91 22 4040 0500',
    address: 'Andheri East, Mumbai 400069',
  },
  {
    id: 'v11', name: 'Google Workspace', legalName: 'Google LLC',
    category: 'SOFTWARE', country: 'US', taxId: '77-0493581',
    paymentTerms: 'Net 30', currency: 'USD', status: 'ACTIVE',
    outstandingBalance: 1180, ytdSpend: 14160, lastTxnDate: '2024-10-11',
    email: 'collections@google.com', phone: '+1 650 253 0000',
    address: '1600 Amphitheatre Pkwy, Mountain View, CA',
  },
  {
    id: 'v12', name: 'HubSpot', legalName: 'HubSpot Inc.',
    category: 'MARKETING', country: 'US', taxId: '20-2632791',
    paymentTerms: 'Net 30', currency: 'USD', status: 'INACTIVE',
    outstandingBalance: 0, ytdSpend: 18000, lastTxnDate: '2024-06-20',
    email: 'ar@hubspot.com', phone: '+1 888 482 7768',
    address: '25 First St, Cambridge, MA',
  },
];

const txn = (
  id: string, vendorId: string, date: string, reference: string,
  type: VendorTxn['type'], description: string, debit: number, credit: number,
  balance: number, currency: VendorTxn['currency'] = 'CAD',
): VendorTxn => ({ id, vendorId, date, reference, type, description, debit, credit, balance, currency });

export const MOCK_VENDOR_TXNS: VendorTxn[] = [
  // v1 Acme
  txn('vt1', 'v1', '2024-08-12', 'BILL-ACME-9870', 'BILL', 'Office paper + toner', 0, 4200, 4200),
  txn('vt2', 'v1', '2024-08-28', 'PAY-2024-104', 'PAYMENT', 'Wire transfer', 4200, 0, 0),
  txn('vt3', 'v1', '2024-09-15', 'BILL-ACME-9905', 'BILL', 'Workstation accessories', 0, 8200, 8200),
  txn('vt4', 'v1', '2024-10-05', 'BILL-ACME-9921', 'BILL', 'Office supplies restock', 0, 10200, 18400),
  // v2 TechPro
  txn('vt5', 'v2', '2024-09-10', 'BILL-TP-3104', 'BILL', 'Q3 advisory engagement', 0, 18000, 18000, 'USD'),
  txn('vt6', 'v2', '2024-10-01', 'BILL-TP-3132', 'BILL', 'Architecture review', 0, 12500, 30500, 'USD'),
  txn('vt7', 'v2', '2024-10-12', 'PAY-2024-122', 'PAYMENT', 'EFT batch', 6000, 0, 24500, 'USD'),
  // v3 AWS
  txn('vt8', 'v3', '2024-09-07', 'AWS-SEP-2024', 'BILL', 'September infra', 0, 4640, 4640, 'USD'),
  txn('vt9', 'v3', '2024-09-25', 'PAY-2024-118', 'PAYMENT', 'Card autopay', 4640, 0, 0, 'USD'),
  txn('vt10', 'v3', '2024-10-07', 'AWS-OCT-2024', 'BILL', 'October infra', 0, 4820, 4820, 'USD'),
  // v4 JetBrains
  txn('vt11', 'v4', '2024-10-10', 'JB-RENEW-24', 'BILL', 'Annual renewal', 0, 185000, 185000, 'INR'),
  txn('vt12', 'v4', '2024-10-18', 'PAY-2024-130', 'PAYMENT', 'UPI transfer', 185000, 0, 0, 'INR'),
];

export const MOCK_VENDOR_DOCS: VendorDocument[] = [
  { id: 'vd1', vendorId: 'v1', kind: 'BILL', number: 'BILL-ACME-9921', issueDate: '2024-10-05', dueDate: '2024-11-04', amount: 10200, currency: 'CAD', status: 'OPEN' },
  { id: 'vd2', vendorId: 'v1', kind: 'BILL', number: 'BILL-ACME-9905', issueDate: '2024-09-15', dueDate: '2024-10-15', amount: 8200, currency: 'CAD', status: 'OVERDUE' },
  { id: 'vd3', vendorId: 'v1', kind: 'CONTRACT', number: 'MSA-ACME-2023', issueDate: '2023-04-01', dueDate: '2025-03-31', amount: 0, currency: 'CAD', status: 'OPEN' },
  { id: 'vd4', vendorId: 'v2', kind: 'BILL', number: 'BILL-TP-3104', issueDate: '2024-09-10', dueDate: '2024-10-25', amount: 18000, currency: 'USD', status: 'PARTIALLY_PAID' },
  { id: 'vd5', vendorId: 'v2', kind: 'BILL', number: 'BILL-TP-3132', issueDate: '2024-10-01', dueDate: '2024-11-15', amount: 12500, currency: 'USD', status: 'OPEN' },
  { id: 'vd6', vendorId: 'v3', kind: 'BILL', number: 'AWS-OCT-2024', issueDate: '2024-10-07', dueDate: '2024-11-06', amount: 4820, currency: 'USD', status: 'OPEN' },
  { id: 'vd7', vendorId: 'v4', kind: 'BILL', number: 'JB-RENEW-24', issueDate: '2024-10-10', dueDate: '2024-10-25', amount: 185000, currency: 'INR', status: 'PAID' },
];

export const MOCK_VENDOR_PAYMENTS: VendorPayment[] = [
  { id: 'vp1', vendorId: 'v1', date: '2024-08-28', reference: 'PAY-2024-104', method: 'WIRE', amount: 4200, currency: 'CAD', appliedTo: ['BILL-ACME-9870'], bankAccount: 'RBC ••••4521' },
  { id: 'vp2', vendorId: 'v2', date: '2024-10-12', reference: 'PAY-2024-122', method: 'EFT', amount: 6000, currency: 'USD', appliedTo: ['BILL-TP-3104'], bankAccount: 'Chase ••••5544' },
  { id: 'vp3', vendorId: 'v3', date: '2024-09-25', reference: 'PAY-2024-118', method: 'CARD', amount: 4640, currency: 'USD', appliedTo: ['AWS-SEP-2024'], bankAccount: 'Amex ••••2003' },
  { id: 'vp4', vendorId: 'v4', date: '2024-10-18', reference: 'PAY-2024-130', method: 'UPI', amount: 185000, currency: 'INR', appliedTo: ['JB-RENEW-24'], bankAccount: 'HDFC ••••0300' },
];

export function getVendorAging(vendorId: string): VendorAging {
  const docs = MOCK_VENDOR_DOCS.filter(d => d.vendorId === vendorId && d.status !== 'PAID');
  const today = new Date('2024-10-20').getTime();
  const aging: VendorAging = { current: 0, d30: 0, d60: 0, d90: 0 };
  for (const d of docs) {
    if (d.kind === 'CONTRACT') continue;
    const due = new Date(d.dueDate).getTime();
    const days = Math.floor((today - due) / 86400000);
    if (days <= 0) aging.current += d.amount;
    else if (days <= 30) aging.d30 += d.amount;
    else if (days <= 60) aging.d60 += d.amount;
    else aging.d90 += d.amount;
  }
  return aging;
}

export const VENDOR_CATEGORY_LABEL: Record<string, string> = {
  PROFESSIONAL_SERVICES: 'Professional services',
  SOFTWARE: 'Software',
  OFFICE_SUPPLIES: 'Office supplies',
  TRAVEL: 'Travel',
  UTILITIES: 'Utilities',
  RENT: 'Rent',
  MARKETING: 'Marketing',
  CONTRACTOR: 'Contractor',
  TELECOM: 'Telecom',
};