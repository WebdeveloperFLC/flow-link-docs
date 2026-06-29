/**
 * Financial Operations Engine — business event correlation.
 */

export type BusinessEventDomain =
  | "money_in"
  | "money_out"
  | "payroll"
  | "commission"
  | "trust"
  | "banking"
  | "hr"
  | "admissions"
  | "compliance"
  | "construction"
  | "generic";

export interface BusinessEvent {
  id: string;
  domain: BusinessEventDomain;
  eventType: string;
  entityId?: string | null;
  branchId?: string | null;
  sourceModule: string;
  sourceRecordId: string;
  createdBy?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface BusinessEventLink {
  businessEventId: string;
  linkType: "payment" | "receipt" | "journal" | "invoice" | "refund" | "trust" | "other";
  recordId: string;
}
