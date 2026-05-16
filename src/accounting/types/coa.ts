export type AccountNature = "DEBIT" | "CREDIT";
export type CoaAccountStatus = "ACTIVE" | "INACTIVE";

export interface AccountGroup {
  code: string;
  label: string;
  nature: AccountNature;
  system?: boolean;
}

export interface AccountType {
  code: string;
  label: string;
  groupCode: string;
  system?: boolean;
}

export interface AccountSubType {
  code: string;
  label: string;
  typeCode: string;
  system?: boolean;
}

export interface CoaAccount {
  id: string;
  code: string;
  name: string;
  groupCode: string;
  typeCode: string;
  subTypeCode?: string | null;
  parentId: string | null;
  currency: string;
  entityId: string | null; // null = all entities
  taxCode?: string | null;
  normalBalance?: AccountNature;
  openingBalance: number;
  currentBalance: number;
  status: CoaAccountStatus;
  description?: string;
  txnCount: number;
  createdAt: string;
}

export interface CoaAccountInput {
  code: string;
  name: string;
  groupCode: string;
  typeCode: string;
  subTypeCode?: string | null;
  parentId: string | null;
  currency: string;
  entityId: string | null;
  taxCode?: string | null;
  normalBalance?: AccountNature;
  openingBalance: number;
  status: CoaAccountStatus;
  description?: string;
}