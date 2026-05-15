export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ON_HOLD';
export type ClientSegment = 'ENTERPRISE' | 'SMB' | 'STARTUP' | 'GOVERNMENT' | 'INDIVIDUAL';

export interface Client {
  id: string;
  name: string;
  legalName: string;
  segment: ClientSegment;
  country: string;
  taxId: string;
  paymentTerms: string;
  currency: 'CAD' | 'USD' | 'INR';
  status: ClientStatus;
  outstandingReceivable: number;
  ytdRevenue: number;
  lastTxnDate: string;
  email: string;
  phone: string;
  address: string;
  accountManager: string;
}

export interface ClientInvoice {
  id: string;
  clientId: string;
  number: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  currency: 'CAD' | 'USD' | 'INR';
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
}

export interface ClientReceipt {
  id: string;
  clientId: string;
  date: string;
  reference: string;
  method: 'WIRE' | 'EFT' | 'CHEQUE' | 'CARD' | 'UPI';
  amount: number;
  currency: 'CAD' | 'USD' | 'INR';
  appliedTo: string[];
  bankAccount: string;
}

export interface ClientTxn {
  id: string;
  clientId: string;
  date: string;
  reference: string;
  type: 'INVOICE' | 'RECEIPT' | 'CREDIT_NOTE';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  currency: 'CAD' | 'USD' | 'INR';
}

export interface ClientAging {
  current: number;
  d30: number;
  d60: number;
  d90: number;
}