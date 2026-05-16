import type {
  Vendor, VendorTxn, VendorDocument, VendorPayment, VendorAging,
} from '../types/vendors';

export const MOCK_VENDORS: Vendor[] = [];

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