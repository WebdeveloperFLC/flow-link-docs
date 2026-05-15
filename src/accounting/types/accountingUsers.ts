export type AccountingRole =
  | "SUPER_ADMIN"
  | "FINANCE_ADMIN"
  | "ACCOUNTANT"
  | "AUDITOR"
  | "FINAL_AUDITOR"
  | "BRANCH_MANAGER"
  | "COMPLIANCE_OFFICER"
  | "VIEWER";

export interface AccountingUser {
  id: string;
  name: string;
  email: string;
  role: AccountingRole;
  entityScope: string[]; // entity ids, or ["*"] for all
  mfaEnabled: boolean;
  lastLogin?: string;
  status: "ACTIVE" | "SUSPENDED" | "INVITED";
}

export const ROLE_DESCRIPTIONS: Record<AccountingRole, string> = {
  SUPER_ADMIN: "Full access across every entity, including settings and billing.",
  FINANCE_ADMIN: "Manage all accounting data and approvals across entities in scope.",
  ACCOUNTANT: "Create and edit journals, bills, invoices, and reconciliations.",
  AUDITOR: "First-line audit review and approval of journals and bills.",
  FINAL_AUDITOR: "Final approval authority on high-value transactions.",
  BRANCH_MANAGER: "Read and approve activity for assigned branches only.",
  COMPLIANCE_OFFICER: "Manage tax filings, notices, and compliance workflows.",
  VIEWER: "Read-only access to dashboards and reports.",
};