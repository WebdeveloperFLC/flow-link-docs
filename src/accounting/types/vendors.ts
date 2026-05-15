export type VendorStatus = 'ACTIVE' | 'INACTIVE' | 'ON_HOLD' | 'BLOCKED';
export type VendorCategory =
  | 'PROFESSIONAL_SERVICES'
  | 'SOFTWARE'
  | 'OFFICE_SUPPLIES'
  | 'TRAVEL'
  | 'UTILITIES'
  | 'RENT'
  | 'MARKETING'
  | 'CONTRACTOR'
  | 'TELECOM';

export interface Vendor {
  id: string;
  name: string;
  legalName: string;
  category: VendorCategory;
  country: string;
  taxId: string;
  paymentTerms: string;            // e.g. "Net 30"
  currency: 'CAD' | 'USD' | 'INR';
  status: VendorStatus;
  outstandingBalance: number;
  ytdSpend: number;
  lastTxnDate: string;
  email: string;
  phone: string;
  address: string;
  bankAccount?: string;
}

export interface VendorTxn {
  id: string;
  vendorId: string;
  date: string;
  reference: string;             // BILL-xxx / PAY-xxx
  type: 'BILL' | 'PAYMENT' | 'CREDIT_NOTE';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  currency: 'CAD' | 'USD' | 'INR';
  journalId?: string;
}

export interface VendorDocument {
  id: string;
  vendorId: string;
  kind: 'INVOICE' | 'BILL' | 'CREDIT_NOTE' | 'CONTRACT';
  number: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  currency: 'CAD' | 'USD' | 'INR';
  status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
}

export interface VendorPayment {
  id: string;
  vendorId: string;
  date: string;
  reference: string;
  method: 'WIRE' | 'EFT' | 'CHEQUE' | 'CARD' | 'UPI';
  amount: number;
  currency: 'CAD' | 'USD' | 'INR';
  appliedTo: string[];           // document numbers
  bankAccount: string;
}

export interface VendorAging {
  current: number;
  d30: number;
  d60: number;
  d90: number;
}