export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ON_HOLD';
export type ClientSegment = 'ENTERPRISE' | 'SMB' | 'STARTUP' | 'GOVERNMENT' | 'INDIVIDUAL';
export type ClientType = 'STUDENT' | 'IMMIGRATION' | 'CORPORATE' | 'FAMILY' | 'COACHING' | 'DEPENDENT';

export interface Client {
  id: string;
  name: string;
  legalName: string;
  segment: ClientSegment;
  clientType?: ClientType;
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
  // Business fields
  counselorId?: string;
  counselorName?: string;
  servicePackage?: string;
  visaCategory?: string;
  intake?: string;
  leadSource?: string;
  notes?: string;
  linkedCrmClientId?: string;
  // Aggregates
  totalRefunds?: number;
  totalDiscounts?: number;
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
  method: 'WIRE' | 'EFT' | 'CHEQUE' | 'CARD' | 'UPI' | 'CASH';
  kind?: 'PAYMENT' | 'REFUND' | 'DISCOUNT' | 'SCHOLARSHIP';
  amount: number;
  currency: 'CAD' | 'USD' | 'INR';
  appliedTo: string[];
  bankAccount: string;
  installmentNo?: number;
  installmentTotal?: number;
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

export interface ClientService {
  id: string;
  clientId: string;
  name: string;
  packageAmount: number;
  amountPaid: number;
  currency: 'CAD' | 'USD' | 'INR';
  startDate: string;
  nextDueDate?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
  installmentsPaid?: number;
  installmentsTotal?: number;
}

export interface ClientNote {
  id: string;
  clientId: string;
  date: string;
  author: string;
  body: string;
}

export interface ClientActivity {
  id: string;
  clientId: string;
  date: string;
  type: 'INVOICE_ISSUED' | 'PAYMENT_RECEIVED' | 'NOTE_ADDED' | 'STATUS_CHANGED' | 'SERVICE_ENROLLED' | 'REFUND_ISSUED' | 'DISCOUNT_APPLIED';
  message: string;
  actor?: string;
}