export type DocType =
  | 'INVOICE' | 'RECEIPT' | 'BANK_STATEMENT' | 'BILL' | 'CHALLAN'
  | 'TAX_NOTICE' | 'PAYMENT_PROOF' | 'CONTRACT' | 'EXPENSE_SLIP' | 'OTHER';

export type OCRStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED' | 'MANUAL';
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
  /** AI-extracted transaction lines, when this doc is a bank/card statement */
  lineItems?: Array<{
    date: string;
    description: string;
    amount: number;
    reference?: string;
  }>;
  /** Error captured when OCR/extraction failed */
  ocrError?: string;
}

export const MOCK_DOCUMENTS: MockDocument[] = [];
