export type DocType =
  | 'INVOICE' | 'RECEIPT' | 'BANK_STATEMENT' | 'BILL' | 'CHALLAN'
  | 'TAX_NOTICE' | 'PAYMENT_PROOF' | 'CONTRACT' | 'EXPENSE_SLIP' | 'OTHER';

export type OCRStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ExtractedData {
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  subtotal?: number;
  taxType?: string;
  taxAmount?: number;
  totalAmount?: number;
  currency?: string;
  paymentMode?: string;
  suggestedLedger?: string;
  suggestedTaxCode?: string;
  confidence: number;
  fieldConfidences?: Record<string, number>;
  isDuplicateSuspected?: boolean;
  duplicateOfId?: string;
}

export interface MockDocument {
  id: string;
  filename: string;
  fileType: 'pdf' | 'image' | 'excel';
  fileSizeKB: number;
  docType: DocType;
  ocrStatus: OCRStatus;
  approvalStatus: ApprovalStatus;
  entity: string;
  uploadedBy: string;
  uploadedAt: string;
  linkedJournalId?: string;
  linkedVendor?: string;
  linkedClient?: string;
  tags: string[];
  extracted?: ExtractedData;
}

export const MOCK_DOCUMENTS: MockDocument[] = [
  // ── 8 COMPLETE (incl. 2 duplicates) ─────────────────────────────
  {
    id: 'd1', filename: 'Acme-Invoice-Oct2024.pdf', fileType: 'pdf', fileSizeKB: 184,
    docType: 'INVOICE', ocrStatus: 'COMPLETE', approvalStatus: 'APPROVED',
    entity: 'Canada HQ', uploadedBy: 'Priya Sharma',
    uploadedAt: '2024-10-15T09:14:00Z', linkedJournalId: 'je4',
    linkedVendor: 'Acme Office Supplies', tags: ['supplies', 'monthly'],
    extracted: {
      vendorName: 'Acme Office Supplies', invoiceNumber: 'BILL-ACME-9921',
      invoiceDate: '2024-10-05', dueDate: '2024-11-04',
      subtotal: 1240, taxType: 'HST-13%', taxAmount: 161.20, totalAmount: 1401.20,
      currency: 'CAD', paymentMode: 'Bank Transfer',
      suggestedLedger: 'a18', suggestedTaxCode: 'HST-13%', confidence: 0.94,
      fieldConfidences: { vendorName: 0.97, invoiceNumber: 0.95, invoiceDate: 0.99, totalAmount: 0.93, taxAmount: 0.88 },
    },
  },
  {
    id: 'd2', filename: 'TechPro-Invoice-1042.pdf', fileType: 'pdf', fileSizeKB: 212,
    docType: 'INVOICE', ocrStatus: 'COMPLETE', approvalStatus: 'PENDING',
    entity: 'USA Corp', uploadedBy: 'Rohit Mehra',
    uploadedAt: '2024-10-14T11:30:00Z',
    linkedVendor: 'TechPro Solutions', tags: ['software'],
    extracted: {
      vendorName: 'TechPro Solutions', invoiceNumber: 'TP-1042',
      invoiceDate: '2024-10-12', dueDate: '2024-11-11',
      subtotal: 4500, taxType: '', taxAmount: 0, totalAmount: 4500,
      currency: 'USD', paymentMode: 'Credit Card',
      suggestedLedger: 'a20', suggestedTaxCode: '', confidence: 0.88,
      fieldConfidences: { vendorName: 0.96, totalAmount: 0.91, invoiceDate: 0.94, taxAmount: 0.55 },
    },
  },
  {
    id: 'd3', filename: 'AirCanada-Receipt-Oct.jpg', fileType: 'image', fileSizeKB: 410,
    docType: 'RECEIPT', ocrStatus: 'COMPLETE', approvalStatus: 'APPROVED',
    entity: 'Canada HQ', uploadedBy: 'Aman Verma',
    uploadedAt: '2024-10-08T16:45:00Z', linkedJournalId: 'je6',
    linkedVendor: 'Air Canada', tags: ['travel', 'flights'],
    extracted: {
      vendorName: 'Air Canada', invoiceNumber: 'AC-998812',
      invoiceDate: '2024-10-06', subtotal: 1820, taxType: 'HST-13%',
      taxAmount: 236.60, totalAmount: 2056.60, currency: 'CAD',
      paymentMode: 'Credit Card', suggestedLedger: 'a17', suggestedTaxCode: 'HST-13%',
      confidence: 0.81,
      fieldConfidences: { vendorName: 0.92, totalAmount: 0.86, taxAmount: 0.62, invoiceDate: 0.88 },
    },
  },
  {
    id: 'd4', filename: 'WeWork-Toronto-Bill-Oct.pdf', fileType: 'pdf', fileSizeKB: 156,
    docType: 'BILL', ocrStatus: 'COMPLETE', approvalStatus: 'APPROVED',
    entity: 'Canada HQ', uploadedBy: 'Priya Sharma',
    uploadedAt: '2024-10-01T14:23:00Z', linkedJournalId: 'je1',
    linkedVendor: 'WeWork Toronto', tags: ['rent'],
    extracted: {
      vendorName: 'WeWork Toronto', invoiceNumber: 'RENT-OCT-2024',
      invoiceDate: '2024-10-01', dueDate: '2024-10-15',
      subtotal: 8500, taxType: 'HST-13%', taxAmount: 1105, totalAmount: 9605,
      currency: 'CAD', paymentMode: 'Bank Transfer',
      suggestedLedger: 'a16', suggestedTaxCode: 'HST-13%', confidence: 0.96,
      fieldConfidences: { vendorName: 0.98, invoiceNumber: 0.94, totalAmount: 0.97, taxAmount: 0.93 },
    },
  },
  {
    id: 'd5', filename: 'HDFC-Statement-Sep2024.pdf', fileType: 'pdf', fileSizeKB: 624,
    docType: 'BANK_STATEMENT', ocrStatus: 'COMPLETE', approvalStatus: 'PENDING',
    entity: 'India Mumbai', uploadedBy: 'Karan Iyer',
    uploadedAt: '2024-10-03T08:00:00Z',
    tags: ['bank', 'reconciliation'],
    extracted: {
      vendorName: 'HDFC Bank', invoiceNumber: 'STMT-09-2024',
      invoiceDate: '2024-09-30', subtotal: 0, totalAmount: 0,
      currency: 'INR', suggestedLedger: 'a2',
      confidence: 0.72,
      fieldConfidences: { vendorName: 0.94, invoiceDate: 0.90, totalAmount: 0.40 },
    },
  },
  {
    id: 'd6', filename: 'JetBrains-Renewal-2024.pdf', fileType: 'pdf', fileSizeKB: 142,
    docType: 'INVOICE', ocrStatus: 'COMPLETE', approvalStatus: 'APPROVED',
    entity: 'India Mumbai', uploadedBy: 'Karan Iyer',
    uploadedAt: '2024-10-10T11:20:00Z', linkedJournalId: 'je7',
    linkedVendor: 'JetBrains s.r.o.', tags: ['software', 'annual'],
    extracted: {
      vendorName: 'JetBrains s.r.o.', invoiceNumber: 'JB-RENEW-24',
      invoiceDate: '2024-10-09', dueDate: '2024-10-30',
      subtotal: 185000, totalAmount: 185000, currency: 'INR',
      paymentMode: 'Bank Transfer', suggestedLedger: 'a20',
      confidence: 0.91,
      fieldConfidences: { vendorName: 0.95, totalAmount: 0.94, invoiceDate: 0.96 },
    },
  },
  // 2 duplicate-suspected
  {
    id: 'd7', filename: 'Acme-Invoice-Oct2024-COPY.pdf', fileType: 'pdf', fileSizeKB: 186,
    docType: 'INVOICE', ocrStatus: 'COMPLETE', approvalStatus: 'PENDING',
    entity: 'Canada HQ', uploadedBy: 'Neha Kapoor',
    uploadedAt: '2024-10-16T09:30:00Z',
    linkedVendor: 'Acme Office Supplies', tags: ['supplies'],
    extracted: {
      vendorName: 'Acme Office Supplies', invoiceNumber: 'BILL-ACME-9921',
      invoiceDate: '2024-10-05', dueDate: '2024-11-04',
      subtotal: 1240, taxType: 'HST-13%', taxAmount: 161.20, totalAmount: 1401.20,
      currency: 'CAD', paymentMode: 'Bank Transfer',
      suggestedLedger: 'a18', suggestedTaxCode: 'HST-13%', confidence: 0.92,
      fieldConfidences: { vendorName: 0.96, totalAmount: 0.93, taxAmount: 0.84 },
      isDuplicateSuspected: true, duplicateOfId: 'd1',
    },
  },
  {
    id: 'd8', filename: 'AWS-October-Invoice.pdf', fileType: 'pdf', fileSizeKB: 98,
    docType: 'INVOICE', ocrStatus: 'COMPLETE', approvalStatus: 'PENDING',
    entity: 'USA Corp', uploadedBy: 'Rohit Mehra',
    uploadedAt: '2024-10-07T09:00:00Z', linkedJournalId: 'je5',
    linkedVendor: 'Amazon Web Services', tags: ['cloud'],
    extracted: {
      vendorName: 'Amazon Web Services', invoiceNumber: 'AWS-OCT-2024',
      invoiceDate: '2024-10-07', subtotal: 4820, totalAmount: 4820,
      currency: 'USD', paymentMode: 'Credit Card',
      suggestedLedger: 'a20',
      confidence: 0.89,
      fieldConfidences: { vendorName: 0.97, totalAmount: 0.90, invoiceDate: 0.95, taxAmount: 0.50 },
      isDuplicateSuspected: true, duplicateOfId: 'd2',
    },
  },
  // ── 4 PENDING ───────────────────────────────────────────────────
  {
    id: 'd9', filename: 'Travel-Receipts-Oct.jpg', fileType: 'image', fileSizeKB: 720,
    docType: 'EXPENSE_SLIP', ocrStatus: 'PENDING', approvalStatus: 'PENDING',
    entity: 'Canada HQ', uploadedBy: 'Aman Verma',
    uploadedAt: '2024-10-17T10:00:00Z', tags: ['travel'],
  },
  {
    id: 'd10', filename: 'Vendor-Bill-Maple.pdf', fileType: 'pdf', fileSizeKB: 245,
    docType: 'BILL', ocrStatus: 'PENDING', approvalStatus: 'PENDING',
    entity: 'Canada HQ', uploadedBy: 'Priya Sharma',
    uploadedAt: '2024-10-17T11:15:00Z', linkedVendor: 'Maple Leaf Logistics',
    tags: [],
  },
  {
    id: 'd11', filename: 'GST-Challan-Sep.pdf', fileType: 'pdf', fileSizeKB: 88,
    docType: 'CHALLAN', ocrStatus: 'PENDING', approvalStatus: 'PENDING',
    entity: 'India Delhi', uploadedBy: 'Karan Iyer',
    uploadedAt: '2024-10-17T12:40:00Z', tags: ['tax', 'gst'],
  },
  {
    id: 'd12', filename: 'Hydro-One-Bill.pdf', fileType: 'pdf', fileSizeKB: 154,
    docType: 'BILL', ocrStatus: 'PENDING', approvalStatus: 'PENDING',
    entity: 'Canada HQ', uploadedBy: 'Neha Kapoor',
    uploadedAt: '2024-10-18T09:00:00Z', linkedVendor: 'Hydro One', tags: ['utilities'],
  },
  // ── 3 PROCESSING ────────────────────────────────────────────────
  {
    id: 'd13', filename: 'CRA-Notice-Q3.pdf', fileType: 'pdf', fileSizeKB: 312,
    docType: 'TAX_NOTICE', ocrStatus: 'PROCESSING', approvalStatus: 'PENDING',
    entity: 'Canada HQ', uploadedBy: 'Priya Sharma',
    uploadedAt: '2024-10-18T13:20:00Z', tags: ['cra', 'tax'],
  },
  {
    id: 'd14', filename: 'Stripe-Payout-Sep.csv', fileType: 'excel', fileSizeKB: 24,
    docType: 'PAYMENT_PROOF', ocrStatus: 'PROCESSING', approvalStatus: 'PENDING',
    entity: 'USA Corp', uploadedBy: 'Rohit Mehra',
    uploadedAt: '2024-10-18T14:00:00Z', tags: ['stripe'],
  },
  {
    id: 'd15', filename: 'Office-Lease-Renewal.pdf', fileType: 'pdf', fileSizeKB: 540,
    docType: 'CONTRACT', ocrStatus: 'PROCESSING', approvalStatus: 'PENDING',
    entity: 'Canada HQ', uploadedBy: 'Aman Verma',
    uploadedAt: '2024-10-18T15:10:00Z', linkedVendor: 'WeWork Toronto', tags: ['legal', 'lease'],
  },
  // ── 3 FAILED ────────────────────────────────────────────────────
  {
    id: 'd16', filename: 'Crumpled-Receipt.jpg', fileType: 'image', fileSizeKB: 1240,
    docType: 'RECEIPT', ocrStatus: 'FAILED', approvalStatus: 'PENDING',
    entity: 'India Mumbai', uploadedBy: 'Karan Iyer',
    uploadedAt: '2024-10-12T08:00:00Z', tags: [],
  },
  {
    id: 'd17', filename: 'Scanned-Invoice-Blurry.pdf', fileType: 'pdf', fileSizeKB: 480,
    docType: 'INVOICE', ocrStatus: 'FAILED', approvalStatus: 'PENDING',
    entity: 'Canada HQ', uploadedBy: 'Neha Kapoor',
    uploadedAt: '2024-10-13T10:30:00Z', tags: [],
  },
  {
    id: 'd18', filename: 'Other-Doc-Unknown.pdf', fileType: 'pdf', fileSizeKB: 76,
    docType: 'OTHER', ocrStatus: 'FAILED', approvalStatus: 'PENDING',
    entity: 'USA Corp', uploadedBy: 'Rohit Mehra',
    uploadedAt: '2024-10-14T16:00:00Z', tags: [],
  },
  // ── 2 extra COMPLETE to round out variety ──────────────────────
  {
    id: 'd19', filename: 'TD-Bank-Training-Inv.pdf', fileType: 'pdf', fileSizeKB: 168,
    docType: 'INVOICE', ocrStatus: 'COMPLETE', approvalStatus: 'APPROVED',
    entity: 'Canada HQ', uploadedBy: 'Neha Kapoor',
    uploadedAt: '2024-10-14T13:10:00Z', linkedJournalId: 'je9',
    linkedClient: 'TD Bank', tags: ['training', 'ar'],
    extracted: {
      vendorName: 'TD Bank Group', invoiceNumber: 'INV-2024-0051',
      invoiceDate: '2024-10-14', dueDate: '2024-11-13',
      subtotal: 8000, taxType: 'HST-13%', taxAmount: 1040, totalAmount: 9040,
      currency: 'CAD', paymentMode: 'Bank Transfer',
      suggestedLedger: 'a14', suggestedTaxCode: 'HST-13%', confidence: 0.93,
      fieldConfidences: { vendorName: 0.95, totalAmount: 0.96, invoiceDate: 0.99 },
    },
  },
  {
    id: 'd20', filename: 'JustLaw-Legal-Fees.pdf', fileType: 'pdf', fileSizeKB: 132,
    docType: 'BILL', ocrStatus: 'COMPLETE', approvalStatus: 'APPROVED',
    entity: 'Canada HQ', uploadedBy: 'Aman Verma',
    uploadedAt: '2024-10-15T18:00:00Z', linkedJournalId: 'je10',
    linkedVendor: 'JustLaw Counsel', tags: ['legal'],
    extracted: {
      vendorName: 'JustLaw Counsel', invoiceNumber: 'BILL-LAW-771',
      invoiceDate: '2024-10-15', dueDate: '2024-11-15',
      subtotal: 2500, taxType: 'HST-13%', taxAmount: 325, totalAmount: 2825,
      currency: 'CAD', paymentMode: 'Bank Transfer',
      suggestedLedger: 'a19', suggestedTaxCode: 'HST-13%', confidence: 0.78,
      fieldConfidences: { vendorName: 0.88, totalAmount: 0.82, invoiceDate: 0.92, taxAmount: 0.66 },
    },
  },
];
